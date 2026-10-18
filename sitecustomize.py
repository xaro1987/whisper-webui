# Device routing for Whisper-WebUI with mixed PyTorch / CTranslate2 builds.
import os
import sys

_TARGET_MODULE = "modules.whisper.faster_whisper_inference"


def _log(message):
    try:
        print(f"[sitecustomize] {message}", flush=True)
    except Exception:
        pass


def _probe_ct2_cuda():
    """Return True when CTranslate2 sees a usable 'cuda' (HIP) device."""
    try:
        import ctranslate2

        return bool(ctranslate2.get_supported_compute_types("cuda"))
    except BaseException:
        return False


def _patch_whisper_device(device):
    """Pin FasterWhisperInference.get_device to a fixed value, lazily."""
    import importlib.machinery

    class _PatchLoader:
        def __init__(self, real):
            self._real = real

        def create_module(self, spec):
            return self._real.create_module(spec)

        def exec_module(self, module):
            self._real.exec_module(module)
            cls = getattr(module, "FasterWhisperInference", None)
            if cls is not None:
                cls.get_device = staticmethod(lambda: device)

        def __getattr__(self, name):
            return getattr(self._real, name)

    class _PatchFinder:
        def find_spec(self, fullname, path=None, target=None):
            if fullname != _TARGET_MODULE:
                return None
            spec = importlib.machinery.PathFinder.find_spec(fullname, path)
            if spec is None or spec.loader is None:
                return None
            spec.loader = _PatchLoader(spec.loader)
            return spec

    sys.meta_path.insert(0, _PatchFinder())


def _neutralize_torch_cuda_stats():
    """Make torch.cuda memory-stats helpers safe on a CPU-only torch build."""
    try:
        import torch

        torch.cuda.reset_max_memory_allocated = lambda *args, **kwargs: None
        torch.cuda.reset_peak_memory_stats = lambda *args, **kwargs: None
    except Exception:
        pass


def _main():
    try:
        import torch

        torch_is_hip = bool(getattr(torch.version, "hip", None))
    except Exception:
        return

    requested_device = os.environ.get("WHISPER_DEVICE", "auto").lower().strip()
    force_cpu = os.environ.get("WHISPER_FORCE_CPU", "").lower().strip() in ("1", "true", "on", "yes")

    if torch_is_hip:
        torch.cuda.is_available = lambda: False
        _patch_whisper_device("cpu")
        _log("ROCm build of torch detected - keeping whisper on CPU")
        return

    if force_cpu or requested_device == "cpu":
        _patch_whisper_device("cpu")
        _log("Whisper pinned to CPU (explicit)")
        return

    if requested_device == "cuda":
        if _probe_ct2_cuda():
            _neutralize_torch_cuda_stats()
            _patch_whisper_device("cuda")
            _log("Whisper pinned to GPU (explicit)")
        else:
            _patch_whisper_device("cpu")
            _log("GPU requested but CTranslate2 has no 'cuda' device - falling back to CPU")
        return

    if _probe_ct2_cuda():
        _neutralize_torch_cuda_stats()
        _patch_whisper_device("cuda")
        _log("CTranslate2 'cuda' device available - whisper pinned to GPU")
    else:
        _patch_whisper_device("cpu")
        _log("CTranslate2 has no 'cuda' device - whisper pinned to CPU")


try:
    _main()
except Exception:
    pass

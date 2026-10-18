# Device routing for Whisper-WebUI with mixed PyTorch / CTranslate2 builds.
#
# This launcher installs a CPU-only PyTorch (so torch-based features such as
# UVR / diarization / translation stay reliable) while CTranslate2 may be the
# official ROCm (HIP) build, which maps HIP devices to "cuda". In that setup
# torch cannot own the GPU, and faster-whisper would fall back to CPU because
# its device detection reads torch.cuda.is_available() (always False here).
#
# Strategy: probe CTranslate2 directly. If it reports a working "cuda" device,
# pin only FasterWhisperInference to "cuda" (lazy patch applied right when the
# app imports it) and neutralize the torch CUDA memory-stats helpers that the
# model offload path calls. Every other feature keeps torch's CPU reality.
#
# Fallbacks:
#   - probe fails (no HIP/CUDA runtime, missing rocm-libs, broken driver):
#     whisper is pinned to "cpu" -> guaranteed working CPU transcription.
#   - ROCm build of torch detected: torch and ROCm CTranslate2 can never share
#     one process (conflicting HIP runtimes), so everything stays on CPU.
#   - WHISPER_FORCE_CPU=1: manual opt-out, e.g. for GPU architectures that the
#     ROCm CTranslate2 wheel has no kernels for.
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
    """Pin FasterWhisperInference.get_device to a fixed value, lazily.

    The patch is applied by a meta-path finder the moment the app imports the
    module, so no app module has to be imported (or even be importable) while
    sitecustomize runs at interpreter startup.
    """
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
    """Make torch.cuda memory-stats helpers safe on a CPU-only torch build.

    BaseTranscriptionPipeline.offload() calls these whenever the whisper
    device is "cuda"; on a CPU build they raise AttributeError.
    """
    import torch

    torch.cuda.reset_max_memory_allocated = lambda *args, **kwargs: None
    torch.cuda.reset_peak_memory_stats = lambda *args, **kwargs: None


def _main():
    try:
        import torch

        torch_is_hip = bool(getattr(torch.version, "hip", None))
    except Exception:
        # Not the launcher's interpreter (e.g. conda's helper python):
        # leave everything untouched.
        return

    if torch_is_hip:
        # ROCm torch + ROCm CTranslate2 = two HIP runtimes in one process
        # (hard hangs). Keep the previous CPU fallback behaviour.
        torch.cuda.is_available = lambda: False
        _patch_whisper_device("cpu")
        _log("ROCm build of torch detected - keeping whisper on CPU")
        return

    if os.environ.get("WHISPER_FORCE_CPU"):
        _patch_whisper_device("cpu")
        _log("WHISPER_FORCE_CPU set - keeping whisper on CPU")
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
    # sitecustomize runs in every python started with our PYTHONPATH
    # (including conda's own helper interpreters, which have no torch) -
    # never let device routing break interpreter startup.
    pass

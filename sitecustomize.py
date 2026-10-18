# Force CPU for CTranslate2 / faster-whisper on ROCm builds.
#
# ROCm torch reports torch.cuda.is_available() == True, but the PyPI builds of
# CTranslate2 are CUDA-only and crash on AMD GPUs with:
#   "CUDA failed with error CUDA driver version is insufficient for CUDA runtime version"
# The app detects the device via torch.cuda.is_available(), so we neutralize that
# check only for HIP (ROCm) builds. faster-whisper then falls back to device
# "auto" -> CPU, while torch itself keeps working (UVR / diarization dropdowns
# can still select cuda manually).
try:
    import torch

    if getattr(torch.version, "hip", None):
        torch.cuda.is_available = lambda: False
except Exception:
    pass

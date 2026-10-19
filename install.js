module.exports = {
  requires: {
    bundle: "ai",
  },
  run: [
    {
      when: "{{!exists('app')}}",
      method: "shell.run",
      params: {
        message: [
          "git clone https://github.com/jhj0517/Whisper-WebUI app",
        ]
      }
    },
    // ---- Launcher patch: keep compute_type default valid for the detected device ----
    // Upstream WhisperParams sets the dropdown value straight from the config, so a
    // default that the device does not support (e.g. float16 on a limited GPU) can
    // crash the UI. reset.js/update.js wipe this change, so it is re-applied here.
    {
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "git apply --reverse --check ../patches/whisper-webui-compute-type.patch >/dev/null 2>&1 && echo \"compute-type patch already applied\" || git apply ../patches/whisper-webui-compute-type.patch",
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        message: [
          "uv pip install -r ../requirements.txt --build-constraints ../build-constraints.txt",
          "uv pip install numpy==1.26.4",
        ]
      }
    },
    {
      method: "script.start",
      params: {
        uri: "torch.js",
        params: {
          venv: "env",
          path: "app",
        }
      }
    },
    // ---- Linux + AMD: ROCm CTranslate2 (official OpenNMT build) ----
    // Whisper runs on the AMD GPU through CTranslate2/HIP while torch stays
    // CPU-only (see torch.js): a ROCm torch build and ROCm CTranslate2 can
    // never coexist in one process. PyPI's ctranslate2 wheel is CUDA-only, so
    // it is replaced below and the HIP runtime libraries it needs are
    // collected into ./rocm-libs (start.js points LD_LIBRARY_PATH at it).
    {
      when: "{{platform === 'linux' && gpu === 'amd'}}",
      method: "fs.download",
      params: {
        uri: "https://github.com/OpenNMT/CTranslate2/releases/download/v4.8.3/rocm-python-wheels-Linux.zip",
        dir: "cache/rocm-wheels"
      }
    },
    {
      when: "{{platform === 'linux' && gpu === 'amd'}}",
      method: "fs.download",
      params: {
        uri: [
          "https://repo.radeon.com/rocm/apt/7.2/pool/main/h/hiprand/hiprand_3.1.0.70200-43~24.04_amd64.deb",
          "https://repo.radeon.com/rocm/apt/7.2/pool/main/r/rocrand/rocrand_4.2.0.70200-43~24.04_amd64.deb"
        ],
        dir: "cache/rocm-debs"
      }
    },
    {
      when: "{{platform === 'linux' && gpu === 'amd'}}",
      method: "shell.run",
      params: {
        venv: "env",
        message: [
          "ls cache/rocm-wheels/temp-linux/ctranslate2-4.8.3-cp*/ >/dev/null 2>&1 || python -m zipfile -e cache/rocm-wheels/rocm-python-wheels-Linux.zip cache/rocm-wheels",
          "uv pip install --force-reinstall --no-deps cache/rocm-wheels/temp-linux/ctranslate2-4.8.3-cp$(python -c \"import sys; print(f'{sys.version_info.major}{sys.version_info.minor}')\")-cp*-manylinux*_x86_64.whl"
        ]
      }
    },
    {
      when: "{{platform === 'linux' && gpu === 'amd'}}",
      method: "shell.run",
      params: {
        message: [
          "mkdir -p rocm-libs; SRC=\"\"; if [ -d /opt/rocm/lib ]; then SRC=/opt/rocm/lib; elif command -v ollama >/dev/null 2>&1; then D=$(dirname \"$(readlink -f \"$(command -v ollama)\")\"); B=$(dirname \"$D\")/lib/ollama; C=$(ls -d \"$B\"/rocm_v7* 2>/dev/null | sort | tail -n1); [ -n \"$C\" ] && SRC=\"$C\"; fi; if [ -z \"$SRC\" ]; then echo \"No HIP runtime found (system ROCm or ollama required) - whisper will stay on CPU\"; else for LIB in libamdhip64.so.7 libhsa-runtime64.so.1 libamd_comgr.so.3 librocprofiler-register.so.0 libhipblas.so.3 libhipblaslt.so.1 libhipblaslt.so.3 librocblas.so.5 librocsolver.so.0 librocroller.so.1 libroctx64.so.4 libdrm.so.2 libdrm_amdgpu.so.1 libelf.so.1 libnuma.so.1; do T=$(ls \"$SRC\"/$LIB* 2>/dev/null | head -n1); if [ -n \"$T\" ]; then ln -sf \"$T\" \"rocm-libs/$LIB\"; fi; done; [ -d \"$SRC/rocblas\" ] && ln -sfn \"$SRC/rocblas\" rocm-libs/rocblas; if ls \"$SRC\"/libhiprand.so.* >/dev/null 2>&1 && ls \"$SRC\"/librocrand.so.* >/dev/null 2>&1; then ln -sf $(ls \"$SRC\"/libhiprand.so.1* | head -n1) rocm-libs/libhiprand.so.1; ln -sf $(ls \"$SRC\"/librocrand.so.1* | head -n1) rocm-libs/librocrand.so.1; else rm -rf cache/rocm-debs/extracted; mkdir -p cache/rocm-debs/extracted/stage; for DEB in cache/rocm-debs/*.deb; do rm -rf cache/rocm-debs/extracted/work; mkdir -p cache/rocm-debs/extracted/work; (cd cache/rocm-debs/extracted/work && ar x \"../../${DEB##*/}\" && tar -xf data.tar.* -C ../stage); done; cp -a cache/rocm-debs/extracted/stage/opt/*/lib/libhiprand* cache/rocm-debs/extracted/stage/opt/*/lib/librocrand* rocm-libs/; fi; fi"
        ]
      }
    },
    {
      when: "{{platform === 'linux' && gpu === 'amd'}}",
      method: "shell.run",
      params: {
        venv: "env",
        message: [
          // Smoke test: if the ROCm build cannot run on this machine
          // (missing/broken HIP runtime, unsupported GPU), fall back to the
          // generic PyPI ctranslate2 so the app keeps working on CPU.
          "LD_LIBRARY_PATH=rocm-libs HSA_OVERRIDE_GFX_VERSION=11.0.0 python -c \"import ctranslate2, sys; sys.exit(0 if ctranslate2.get_supported_compute_types('cuda') else 1)\" && echo \"ROCm CTranslate2 OK\" || (echo \"ROCm CTranslate2 unavailable - reverting to the CPU-compatible PyPI build\" && uv pip install --force-reinstall \"ctranslate2>=4.5,<5\")"
        ]
      }
    }
  ]
}

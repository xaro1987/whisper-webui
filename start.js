module.exports = {
  requires: {
    bundle: "ai",
  },
  daemon: true,
  run: [
    {
      method: "shell.run",
      params: {
        venv: "env",
        env: {
          // Expose the launcher root so Python picks up sitecustomize.py,
          // which pins faster-whisper to the GPU (CTranslate2 ROCm build) or
          // falls back to CPU when no GPU device is available.
          PYTHONPATH: "{{path.resolve(cwd)}}",
          // HIP runtime libraries for the ROCm build of CTranslate2
          // (populated by install.js into rocm-libs/).
          LD_LIBRARY_PATH: "{{path.resolve(cwd)}}/rocm-libs",
          // The ROCm CTranslate2 wheel has no kernels for gfx1103
          // (Ryzen 7040/8040 "Phoenix"/"Hawk Point" iGPUs), so run as
          // gfx1100. Harmless for other RDNA3 GPUs. If you have an RDNA2
          // (gfx1030) or older GPU, comment this line out - see README.md.
          HSA_OVERRIDE_GFX_VERSION: "11.0.0"
        },
        path: "app",
        message: [
          "python app.py --inbrowser False",
        ],
        on: [{
          event: "/(http:\\/\\/[0-9.:]+)/",
          done: true
        }]
      }
    },
    {
      method: "local.set",
      params: {
        url: "{{input.event[1]}}"
      }
    }
  ]
}

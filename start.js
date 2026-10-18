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
          PYTHONPATH: "{{path.resolve(cwd)}}",
          LD_LIBRARY_PATH: "{{path.resolve(cwd)}}/rocm-libs",
          HSA_OVERRIDE_GFX_VERSION: "{{(args && args.override_gfx === false) ? '' : '11.0.0'}}",
          HSA_ENABLE_SDMA: "{{(args && typeof args.hsa_sdma !== 'undefined') ? (args.hsa_sdma ? '1' : '0') : ''}}",
          GPU_MAX_ALLOC_PERCENT: "90",
          PYTORCH_CUDA_ALLOC_CONF: "expandable_segments:True",
          WHISPER_DEVICE: "{{args && args.device ? args.device : 'cpu'}}",
          WHISPER_COMPUTE_TYPE: "{{args && args.compute_type ? args.compute_type : ''}}",
          WHISPER_FORCE_CPU: "{{(args && args.device === 'cpu') ? '1' : ((args && args.force_cpu) ? '1' : '')}}"
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

module.exports = {
  daemon: true,
  run: [
<<<<<<< HEAD
    // ---- Record the requested device so the launcher can show the active mode ----
    {
      method: "local.set",
      params: {
        device: "{{args && args.device ? args.device : 'cpu'}}"
      }
    },
    {
      method: "log",
      params: {
        raw: "Whisper tryb: {{args && args.device ? args.device : 'cpu'}}"
      }
    },
    // ---- Preflight: detect a wedged GPU before launching (Linux + GPU only) ----
    // After an amdgpu hang the GPU can stay stuck at ~100% busy until reboot;
    // launching GPU mode in that state always ends in another hang/crash.
=======
>>>>>>> 33ce71d (fix(device): explicit CPU/GPU start, no auto-start race, in-app device switch)
    {
      method: "local.set",
      params: {
        device: "{{args.device || 'cuda'}}"
      }
    },
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        env: {
          PYTHONPATH: "{{cwd}}",
          PATH: "{{env.PATH}}",
          WHISPER_DEVICE: "{{local.device}}",
          CUDA_VISIBLE_DEVICES: "{{local.device === 'cuda' ? '0' : ''}}",
          LD_LIBRARY_PATH: "{{cwd}}/rocm-libs",
          HSA_OVERRIDE_GFX_VERSION: "11.0.0",
          HSA_ENABLE_SDMA: "0",
          HSA_USE_SVM: "0"
        },
        message: [
          "python app.py --host 127.0.0.1 --port {{port}}"
        ],
        on: [
          {
            event: "/(http:\\/\\/[0-9.:]+)/",
            done: true
          }
        ]
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

module.exports = {
  daemon: true,
  run: [
    // Record requested device
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
    // Preflight: detect wedged GPU on Linux
    {
      id: "preflight",
      when: "{{args.device === 'cuda' && platform === 'linux'}}",
      method: "shell.run",
      params: {
        message: [
          "b=$(for i in 1 2 3 4; do for f in /sys/class/drm/card*/device/gpu_busy_percent; do cat \"$f\" 2>/dev/null; done; sleep 1; done | sort -n | tail -1); s=OK; [ \"${b:-0}\" -ge 90 ] && s=WEDGED; echo \"PREFLIGHT_$s\""
        ],
        on: [{
          event: "/PREFLIGHT_(WEDGED|OK)/",
          done: true
        }]
      }
    },
    {
      when: "{{args.device === 'cuda' && platform === 'linux'}}",
      method: "local.set",
      params: {
        preflight: "{{input.event[1]}}"
      }
    },
    {
      when: "{{local.preflight === 'WEDGED'}}",
      method: "input",
      params: {
        title: "GPU wydaje się zawieszone",
        description: "GPU przez kilka sekund raportuje ~100% zajętości bez obciążenia - to typowy objaw zawieszenia po wcześniejszym GPU Hang (amdgpu MES).",
        type: "modal",
        form: [{
          type: "select",
          key: "action",
          default: "abort",
          items: [
            { label: "Zatrzymaj i zrób reboot", value: "abort" },
            { label: "Kontynuuj mimo ryzyka", value: "continue" }
          ]
        }]
      }
    },
    {
      when: "{{local.preflight === 'WEDGED' && args.action === 'abort'}}",
      method: "script.stop",
      params: { uri: "start.js" }
    },
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        env: {
          PYTHONPATH: "{{cwd}}",
          PATH: "{{env.PATH}}",
          WHISPER_DEVICE: "{{args.device === 'cuda' && local.preflight !== 'WEDGED' ? 'cuda' : (args.device === 'cpu' ? 'cpu' : 'cpu')}}",
          CUDA_VISIBLE_DEVICES: "{{args.device === 'cuda' && local.preflight !== 'WEDGED' ? '0' : ''}}",
          LD_LIBRARY_PATH: "{{cwd}}/rocm-libs",
          HSA_OVERRIDE_GFX_VERSION: "11.0.0",
          HSA_ENABLE_SDMA: "0",
          HSA_USE_SVM: "0"
        },
        message: [
          "python app.py --host 127.0.0.1 --port {{port}}"
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

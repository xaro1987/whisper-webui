module.exports = {
  requires: {
    bundle: "ai",
  },
  daemon: true,
  run: [
    // ---- Preflight: detect a wedged GPU before launching (Linux + GPU only) ----
    // After an amdgpu hang the GPU can stay stuck at ~100% busy until reboot;
    // launching GPU mode in that state always ends in another hang/crash.
    {
      id: "preflight",
      when: "{{args.device === 'cuda' && platform === 'linux'}}",
      method: "shell.run",
      params: {
        message: [
          "for i in 1 2 3 4; do for f in /sys/class/drm/card*/device/gpu_busy_percent; do cat \"$f\" 2>/dev/null; done; sleep 1; done | awk 'BEGIN{m=0}{if($1+0>m)m=$1+0}END{if(m>=90)print \"PREFLIGHT_WEDGED\";else print \"PREFLIGHT_OK\"}'"
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
        description: "GPU przez kilka sekund raportuje ~100% zajętości bez obciążenia - to typowy objaw zawieszenia po wcześniejszym GPU Hang (amdgpu MES). Uruchomienie trybu GPU teraz prawie na pewno zakończy się kolejnym zawieszeniem. Zalecany wybór: przerwij i zrób reboot.",
        type: "modal",
        form: [{
          type: "select",
          key: "action",
          title: "Co zrobić?",
          items: [{
            text: "Przerwij - zrób reboot (zalecane)",
            value: "abort"
          }, {
            text: "Uruchom mimo ryzyka",
            value: "continue"
          }],
          default: "abort",
          required: true
        }]
      }
    },
    {
      when: "{{local.preflight === 'WEDGED' && input.action === 'abort'}}",
      method: "log",
      params: {
        raw: "Start GPU anulowany. Zrób reboot, a potem uruchom ponownie. W międzyczasie użyj 'Start (CPU - Stable)'."
      }
    },
    {
      when: "{{local.preflight === 'WEDGED' && input.action === 'abort'}}",
      method: "jump",
      params: {
        id: "aborted"
      }
    },
    // ---- Launch ----
    {
      method: "shell.run",
      params: {
        venv: "env",
        env: {
          PYTHONPATH: "{{path.resolve(cwd)}}",
          LD_LIBRARY_PATH: "{{path.resolve(cwd)}}/rocm-libs",
          HSA_OVERRIDE_GFX_VERSION: "{{(args && args.override_gfx === false) ? '' : '11.0.0'}}",
          HSA_ENABLE_SDMA: "{{(args && args.hsa_sdma === true) ? '1' : ((args && args.device === 'cuda') ? '0' : '')}}",
          HSA_USE_SVM: "{{(args && args.device === 'cuda') ? '0' : ''}}",
          AMD_SERIALIZE_KERNEL: "{{(args && args.serialize) ? '3' : ''}}",
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
    },
    {
      id: "aborted",
      method: "log",
      params: {
        raw: "Start przerwany."
      }
    }
  ]
}

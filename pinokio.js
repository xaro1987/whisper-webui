module.exports = {
  title: "Whisper-WebUI (ROCm 780M) - launcher",
  description: "Launch Whisper-WebUI with fixed AMD ROCm/GPU defaults, compute type UI fix, chunked transcription, device switch, no auto-start.",
  icon: "icon.png",
  menu: async (kernel, info) => {
<<<<<<< HEAD
    let installed = info.exists("app/env/pyvenv.cfg")
    let running = {
      install: info.running("install.js"),
      start: info.running("start.js"),
      update: info.running("update.js"),
      reset: info.running("reset.js"),
      link: info.running("link.js")
    }
    if (running.install) {
      return [{
        default: true,
        icon: "fa-solid fa-plug",
        text: "Installing",
        href: "install.js",
      }]
    } else if (installed) {
      if (running.start) {
        let local = info.local("start.js")
        let device = (local && local.device) ? local.device : "cpu"
        let isGpu = device === "cuda"
        let wedged = local && local.preflight === 'WEDGED'
        let warning = wedged ? [{
          icon: "fa-solid fa-triangle-exclamation",
          text: "<div><strong>GPU zawieszone</strong><div>Preflight wykrył zawieszone GPU - zrób reboot, zamiast używać trybu GPU</div></div>",
          href: "start.js",
        }] : []
        let switchItem = {
          icon: isGpu ? 'fa-solid fa-microchip' : 'fa-solid fa-bolt',
          text: isGpu ? "Przełącz na CPU (restart)" : "Przełącz na GPU (restart)",
          href: "switch.js",
          params: { device: isGpu ? "cpu" : "cuda" }
        }
        if (local && local.url) {
          return [{
            default: true,
            icon: "fa-solid fa-rocket",
            text: isGpu ? "Open Web UI (GPU)" : "Open Web UI (CPU)",
            href: local.url,
          }].concat(warning, [switchItem, {
            icon: 'fa-solid fa-terminal',
            text: "Terminal",
            href: "start.js",
          }])
        } else {
          return [{
            default: true,
            icon: 'fa-solid fa-terminal',
            text: isGpu ? "Terminal (GPU)" : "Terminal (CPU)",
            href: "start.js",
          }].concat(warning, [switchItem])
        }
      } else if (running.update) {
        return [{
          default: true,
          icon: 'fa-solid fa-terminal',
          text: "Updating",
          href: "update.js",
        }]
      } else if (running.reset) {
        return [{
          default: true,
          icon: 'fa-solid fa-terminal',
          text: "Resetting",
          href: "reset.js",
        }]
      } else if (running.link) {
        return [{
          default: true,
          icon: 'fa-solid fa-terminal',
          text: "Deduplicating",
          href: "link.js",
        }]
      } else {
        return [{
          icon: "fa-solid fa-power-off",
          text: "Start (CPU - Stable)",
          href: "start.js",
          params: { device: "cpu" }
        }, {
          icon: "fa-solid fa-bolt",
          text: "Start (GPU - Experimental)",
          href: "start.js",
          params: { device: "cuda" }
        }, {
          icon: "fa-solid fa-sliders",
          text: "Advanced",
          menu: [{
            icon: "fa-solid fa-shield-halved",
            text: "GPU (serialized kernels - stability)",
            href: "start.js",
            params: { device: "cuda", serialize: true }
          }, {
            icon: "fa-solid fa-bolt",
            text: "GPU (no HSA override)",
            href: "start.js",
            params: { device: "cuda", override_gfx: false }
          }, {
            icon: "fa-solid fa-bolt",
            text: "GPU (HSA_SDMA=1)",
            href: "start.js",
            params: { device: "cuda", hsa_sdma: true }
          }]
        }, {
          icon: "fa-solid fa-plug",
          text: "Update",
          href: "update.js",
        }, {
          icon: "fa-solid fa-plug",
          text: "Install",
          href: "install.js",
        }, {
          icon: "fa-solid fa-file-zipper",
          text: "<div><strong>Save Disk Space</strong><div>Deduplicates redundant library files</div></div>",
          href: "link.js",
        }, {
          icon: "fa-regular fa-circle-xmark",
          text: "<div><strong>Reset</strong><div>Revert to pre-install state</div></div>",
          href: "reset.js",
          confirm: "Are you sure you wish to reset the app?"
        }]
      }
    } else {
      return [{
        default: true,
        icon: "fa-solid fa-plug",
        text: "Install",
        href: "install.js",
      }]
    }
=======
    const device = await info.local("/start.js");
    const current = device?.device || "unknown";
    return [
      {
        html: `<i class="fa-solid fa-circle-info"></i> Device: ${current} <span style='opacity:0.5'>(change via 'Przełącz na CPU/GPU')</span>`
      },
      { default: true, text: "Start (GPU - default)", icon: "fa-solid fa-play", href: "start.js?device=cuda" },
      { text: "Start (CPU - Stable)", icon: "fa-solid fa-microchip", href: "start.js?device=cpu" },
      { text: "Przełącz na CPU/GPU (restart)", icon: "fa-solid fa-repeat", href: "switch.js" },
      { text: "Transcribe file (chunked)", icon: "fa-solid fa-scissors", href: "transcribe.js" },
      { text: "Install", icon: "fa-solid fa-download", href: "install.js" },
      { text: "Update", icon: "fa-solid fa-rotate", href: "update.js" },
      { text: "Reset", icon: "fa-solid fa-trash-can", href: "reset.js" },
      { text: "Smoke test (GPU)", icon: "fa-solid fa-rocket", href: "smoke.js" },
      { text: "Logs", icon: "fa-solid fa-file-lines", href: "logs/" },
      { text: "README", icon: "fa-solid fa-book", href: "README.md" }
    ];
>>>>>>> 33ce71d (fix(device): explicit CPU/GPU start, no auto-start race, in-app device switch)
  }
}

const path = require('path')
module.exports = {
  version: "3.7",
  title: "Whisper-WebUI",
  description: "A Web UI for easy subtitle using whisper model.",
  icon: "icon.png",
  menu: async (kernel, info) => {
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
        let wedged = local && local.preflight === 'WEDGED'
        let warning = wedged ? [{
          icon: "fa-solid fa-triangle-exclamation",
          text: "<div><strong>GPU zawieszone</strong><div>Preflight wykrył zawieszone GPU - zrób reboot, zamiast używać trybu GPU</div></div>",
          href: "start.js",
        }] : []
        if (local && local.url) {
          return [{
            default: true,
            icon: "fa-solid fa-rocket",
            text: "Open Web UI",
            href: local.url,
          }].concat(warning, [{
            icon: 'fa-solid fa-terminal',
            text: "Terminal",
            href: "start.js",
          }])
        } else {
          return [{
            default: true,
            icon: 'fa-solid fa-terminal',
            text: "Terminal",
            href: "start.js",
          }].concat(warning)
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
          default: true,
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
  }
}

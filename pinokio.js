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
        if (local && local.url) {
          return [{
            default: true,
            icon: "fa-solid fa-rocket",
            text: "Open Web UI",
            href: local.url,
          }, {
            icon: 'fa-solid fa-terminal',
            text: "Terminal",
            href: "start.js",
          }]
        } else {
          return [{
            default: true,
            icon: 'fa-solid fa-terminal',
            text: "Terminal",
            href: "start.js",
          }]
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
          params: { device: "cuda", compute_type: "int8_float16" }
        }, {
          icon: "fa-solid fa-sliders",
          text: "Advanced",
          menu: [{
            icon: "fa-solid fa-bolt",
            text: "GPU (float16)",
            href: "start.js",
            params: { device: "cuda", compute_type: "float16" }
          }, {
            icon: "fa-solid fa-bolt",
            text: "GPU (int8)",
            href: "start.js",
            params: { device: "cuda", compute_type: "int8" }
          }, {
            icon: "fa-solid fa-bolt",
            text: "GPU (int8_float16, no HSA override)",
            href: "start.js",
            params: { device: "cuda", compute_type: "int8_float16", override_gfx: false }
          }, {
            icon: "fa-solid fa-bolt",
            text: "GPU (int8_float16, HSA_SDMA=0)",
            href: "start.js",
            params: { device: "cuda", compute_type: "int8_float16", hsa_sdma: false }
          }, {
            icon: "fa-solid fa-bolt",
            text: "GPU (int8_float16, no HSA override, HSA_SDMA=0)",
            href: "start.js",
            params: { device: "cuda", compute_type: "int8_float16", override_gfx: false, hsa_sdma: false }
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

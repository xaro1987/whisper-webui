const { app } = require('./pins.js')

module.exports = {
  run: [{
    // Launcher update: fast-forward only. A diverged history fails loudly
    // instead of silently producing a merge commit or conflicts.
    method: "shell.run",
    params: {
      message: "git pull --ff-only"
    }
  }, {
    // The app is pinned to the tested revision (see pins.js): fetch and
    // force-checkout it instead of following upstream master.
    method: "shell.run",
    params: {
      path: "app",
      message: [
        "git fetch --all --tags",
        "git checkout --force " + app.commit,
      ]
    }
  }, {
    // git checkout --force above drops the launcher patch; re-apply it (idempotent).
    method: "shell.run",
    params: {
      path: "app",
      message: "if git apply --reverse --check ../patches/whisper-webui-compute-type.patch >/dev/null 2>&1; then echo \"compute-type patch already applied\"; elif git apply -3 ../patches/whisper-webui-compute-type.patch; then echo \"compute-type patch applied\"; else echo \"Error: compute-type patch failed to apply\"; exit 1; fi; grep -q default_compute_type modules/whisper/data_classes.py || { echo \"Error: compute-type patch verification failed\"; exit 1; }"
    }
  }, {
    method: "script.start",
    params: {
      uri: "smoke.js"
    }
  }]
}

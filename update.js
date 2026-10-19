module.exports = {
  run: [{
    method: "shell.run",
    params: {
      message: "git pull"
    }
  }, {
    method: "shell.run",
    params: {
      message: "git reset --hard HEAD",
      path: "app"
    }
  }, {
    method: "shell.run",
    params: {
      path: "app",
      message: "git pull"
    }
  }, {
    // git reset --hard above drops the launcher patch; re-apply it (idempotent).
    method: "shell.run",
    params: {
      path: "app",
      message: "git apply --reverse --check ../patches/whisper-webui-compute-type.patch >/dev/null 2>&1 && echo \"compute-type patch already applied\" || git apply ../patches/whisper-webui-compute-type.patch"
    }
  }]
}

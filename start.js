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
          // which forces CTranslate2 / faster-whisper onto CPU on ROCm builds.
          PYTHONPATH: "{{path.resolve(cwd)}}"
        },
        path: "app",
        message: [
          "python app.py --inbrowser False",
        ],
        on: [{
          event: "/(http:\\/\\/\\S+)/",
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

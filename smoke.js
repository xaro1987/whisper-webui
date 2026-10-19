module.exports = {
  // Post-install/update health check. Fails loudly (blue error screen) so a
  // broken app update or a patch that no longer applies is caught immediately.
  run: [
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        env: {
          PYTHONPATH: "{{path.resolve(cwd, 'app') + path.delimiter + path.resolve(cwd)}}",
          LD_LIBRARY_PATH: "{{path.resolve(cwd, 'rocm-libs')}}",
          HSA_OVERRIDE_GFX_VERSION: "11.0.0"
        },
        message: [
          "python ../smoke_test.py",
        ],
        on: [
          { event: "/SMOKE_FAIL/", break: true },
          { event: "/SMOKE_OK/", done: true }
        ]
      }
    }
  ]
}

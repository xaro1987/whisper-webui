module.exports = {

  run: [
    {

  daemon: false,
  run: [
    {
      method: "local.get",
      params: { key: "device", uri: "/start.js" }
    },
    {
      method: "input",
      params: {
        title: "Przełącz tryb urządzenia",
        description: "Aktualny tryb: {{input.device || 'unknown'}}. Restartuje start.js.",
        form: [
          {
            key: "device",
            type: "select",
            title: "Wybierz tryb",
            items: [
              { label: "GPU (cuda)", value: "cuda" },
              { label: "CPU", value: "cpu" }
            ],
            default: "{{input.device || 'cuda'}}"
          }
        ]
      }
    },
    {

      method: "script.restart",
      params: {
        uri: "start.js",
        params: {

          device: "{{args && args.device ? args.device : 'cpu'}}"

          device: "{{args.device}}"

        }
      }
    }
  ]
}

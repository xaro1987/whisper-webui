module.exports = {
  run: [
    {
      method: "script.restart",
      params: {
        uri: "start.js",
        params: {
          device: "{{args && args.device ? args.device : 'cpu'}}"
        }
      }
    }
  ]
}

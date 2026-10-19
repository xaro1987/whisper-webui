module.exports = {
  daemon: false,
  run: [
    {
      method: "input",
      params: {
        title: "Chunked Transcription (GPU fallback-safe)",
        description: "Split media into chunks, transcribe each with Whisper-WebUI inference, merge into .txt/.srt. Uses current WebUI settings (model, language) if desired.",
        form: [
          { key: "input", title: "Media file path", type: "file", accept: "audio/*,video/*,.mp3,.m4a,.wav,.flac,.mp4,.mkv,.mov,.webm,.opus,.aac,.ogg" },
          { key: "model", title: "Model", type: "text", default: "large-v3" },
          { key: "lang", title: "Language (en/pl/auto)", type: "text", default: "auto" },
          { key: "compute", title: "Compute type", type: "select", items: [
            { label: "float16", value: "float16" },
            { label: "float32", value: "float32" },
            { label: "int8_float16", value: "int8_float16" },
            { label: "int8", value: "int8" }
          ], default: "float16" },
          { key: "chunk", title: "Chunk length (seconds)", type: "number", default: 120 },
          { key: "output", title: "Output folder (optional)", type: "text" }
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        env: {
          WHISPER_DEVICE: "cuda",
          LD_LIBRARY_PATH: "{{cwd}}/rocm-libs",
          HSA_OVERRIDE_GFX_VERSION: "11.0.0",
          HSA_ENABLE_SDMA: "0",
          HSA_USE_SVM: "0"
        },
        message: [
          "PYTHONPATH={{cwd}} FFMPEG={{which('ffmpeg')}} ../env/bin/python ../transcribe.py --input {{args.input}} --model {{args.model}} --lang {{args.lang}} --compute {{args.compute}} --chunk {{args.chunk}} {{args.output ? '--output ' + args.output : ''}}"
        ]
      }
    }
  ]
}

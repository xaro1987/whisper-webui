# Whisper WebUI

A Pinokio launcher for [Whisper-WebUI](https://github.com/jhj0517/Whisper-WebUI) —
a browser interface for speech-to-text / subtitle generation using OpenAI's
Whisper models (via `faster-whisper`, `openai-whisper`, and
`insanely-fast-whisper`).

## What it does

Upload audio/video (or point it at a YouTube link) and generate transcriptions
and subtitles (SRT, WebVTT, TXT, LRC) with word-level timestamps. Optional
post-processing includes Silero VAD noise filtering, music/BGM separation
(UVR / MDX-Net), and speaker diarization (pyannote).

## How to use

1. Open the launcher in Pinokio and press **Install**. This clones the app,
   installs dependencies into `env/`, and on Linux + AMD systems also sets up
   the ROCm CTranslate2 build (see below).
2. Press **Start**. When the web UI is ready, the **Open Web UI** tab appears
   automatically (or use the **Terminal** tab).
3. Pick a Whisper model, language, and options, then transcribe.

Other launcher actions (in the menu):
- **Update** — pulls the latest launcher + app code and reinstalls.
- **Install** — re-runs installation.
- **Save Disk Space** — deduplicates redundant venv/library files (`link.js`).
- **Reset** — wipes the venv and `app/` to start from scratch (`reset.js`).

## GPU acceleration (Linux + AMD)

Whisper inference runs on the GPU through the official
[ROCm build of CTranslate2](https://github.com/OpenNMT/CTranslate2/releases)
(HIP), while PyTorch stays CPU-only. This is deliberate: a ROCm PyTorch build
and ROCm CTranslate2 can never share one process (conflicting HIP runtimes),
and every torch-based feature (BGM separation, diarization, translation) is
reliable on CPU.

`install.js` (Linux + AMD only) downloads the ROCm CTranslate2 wheel and
collects the HIP runtime libraries it needs into `./rocm-libs` (sourced from a
system ROCm install or from [ollama](https://ollama.com)'s bundled ROCm
libraries). `start.js` points `LD_LIBRARY_PATH` at this folder and sets
`HSA_OVERRIDE_GFX_VERSION=11.0.0` so that Ryzen 7040/8040 "Phoenix"/"Hawk
Point" iGPUs (gfx1103, which the ROCm wheel has no kernels for) run as gfx1100.

A smoke test during install falls back to the generic (CPU-compatible) PyPI
`ctranslate2` build if the ROCm build cannot run on your machine, so a
CPU-only setup always keeps working. At startup, `sitecustomize.py` probes
CTranslate2 and pins `faster-whisper` to the GPU only when a working `cuda`
(HIP) device is present — otherwise it pins whisper to CPU.

### Troubleshooting GPU

- **RDNA2 (RX 6000 / Radeon 680M) or older GPUs:** the ROCm wheel already has
  native kernels for gfx1030, so edit `start.js` and comment out the
  `HSA_OVERRIDE_GFX_VERSION` line.
- **Force CPU:** set the environment variable `WHISPER_FORCE_CPU=1` (e.g. in
  the `env` block of `start.js`).
- **`import ctranslate2` fails / `libhiprand.so.1` errors:** re-run **Install**
  so `rocm-libs/` is regenerated, or install ROCm / ollama so a HIP runtime is
  available.

## API

The app is a [Gradio](https://gradio.app) Blocks UI. To use it
programmatically, start it with the Gradio API enabled by editing the
`message` in `start.js` to add `--api_open True`, then restart. The API is then
served on the same host/port as the web UI (default `http://127.0.0.1:7860`).

The most convenient client is `gradio_client` (installed with Gradio). Because
the transcription endpoints are auto-numbered, connect first and inspect the
named/numbered endpoints:

### Python

```python
from gradio_client import Client

client = Client("http://127.0.0.1:7860")
print(client.view_api())          # list endpoints and their signatures
result = client.predict(
    "sample.wav",                 # audio file path or URL
    "tiny",                       # whisper model size
    api_name="/predict"           # use the endpoint shown by view_api()
)
print(result)
```

### JavaScript

```js
import { Client } from "@gradio/client";

const client = await Client.connect("http://127.0.0.1:7860");
const { data } = await client.predict("/predict", {
  wav: "sample.wav",
  model_size: "tiny",
});
console.log(data);
```

### Curl

Gradio exposes each endpoint as JSON over HTTP. Replace `/predict` with the
endpoint reported by `view_api()`, and send a multipart upload:

```bash
# 1) upload the file, get a Gradio file descriptor
FILE_ID=$(curl -s -F "files=@sample.wav" http://127.0.0.1:7860/upload/fn | jq -r '.[0].name')

# 2) call the transcription endpoint
curl -s -X POST http://127.0.0.1:7860/predict \
  -H 'Content-Type: application/json' \
  -d "{\"data\":[{\"path\":\"$FILE_ID\"},\"tiny\"]}"
```

The response contains the transcribed segments with start/end timestamps and
text. See the app's [docs](https://github.com/jhj0517/Whisper-WebUI) for the
full set of parameters (VAD, diarization, BGM separation, output format).

## Device selection (CPU/GPU)

Pinokio UI now offers device selection:
- **Start (CPU - Stable)** – safest for AMD iGPUs (gfx1103). Whisper runs on CPU, torch-based features remain stable.
- **Start (GPU - Experimental)** – tries ROCm CTranslate2 on GPU with `int8_float16` (lower VRAM/compute pressure). May be unstable on some iGPUs (kernel MES resets). 
- **Advanced** – fine-tune: `float16`/`int8`/`int8_float16`, toggle `HSA_OVERRIDE_GFX_VERSION`, toggle `HSA_ENABLE_SDMA`.

Environment variables respected by `sitecustomize.py`:
- `WHISPER_DEVICE=cpu|cuda|auto` – force device
- `WHISPER_FORCE_CPU=1` – force CPU
- `WHISPER_COMPUTE_TYPE=float16|int8|int8_float16|...` – passed to faster-whisper (via UI params)


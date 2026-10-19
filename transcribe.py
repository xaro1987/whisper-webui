"""Chunked Whisper transcription helper for the Pinokio launcher.

Splits a media file into fixed-length audio chunks with ffmpeg, runs the
Whisper-WebUI inference on each chunk individually, then merges the segments
(with corrected timestamps) back into a single .srt and .txt.

Chunking keeps each request short, which avoids the long-form hallucination /
truncation that Whisper shows on this ROCm/iGPU setup for large models.
"""
import argparse
import glob
import os
import shutil
import subprocess
import sys
import tempfile
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.join(HERE, "app")
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)


def wav_duration(path):
    with wave.open(path, "rb") as w:
        return w.getnframes() / float(w.getframerate())


def srt_timestamp(seconds):
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def split_audio(ffmpeg, src, tmp, chunk_seconds):
    wav = os.path.join(tmp, "audio.wav")
    subprocess.run(
        [ffmpeg, "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", "-f", "wav", wav],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    pattern = os.path.join(tmp, "chunk_%04d.wav")
    subprocess.run(
        [ffmpeg, "-y", "-i", wav, "-f", "segment",
         "-segment_time", str(chunk_seconds), "-reset_timestamps", "1", pattern],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    return sorted(glob.glob(os.path.join(tmp, "chunk_*.wav")))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="media file to transcribe")
    ap.add_argument("--model", default="large-v3")
    ap.add_argument("--lang", default=None)
    ap.add_argument("--compute", default="float16")
    ap.add_argument("--chunk", type=int, default=120, help="chunk length in seconds")
    ap.add_argument("--output", default=None, help="output folder (default: next to input)")
    ap.add_argument("--ffmpeg", default=os.environ.get("FFMPEG", "ffmpeg"))
    args = ap.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: input file not found: {args.input}", flush=True)
        return 2

    from modules.whisper.data_classes import WhisperParams
    from modules.whisper.faster_whisper_inference import FasterWhisperInference

    lang = args.lang
    if lang and lang.strip().lower() in ("", "auto", "automatic detection"):
        lang = None

    params = WhisperParams()
    params.model_size = args.model
    params.compute_type = args.compute
    params.lang = lang
    params.condition_on_previous_text = False

    inference = FasterWhisperInference()
    print(f"device={inference.device} model={args.model} compute={args.compute} "
          f"lang={lang} chunk={args.chunk}s", flush=True)

    tmp = tempfile.mkdtemp(prefix="whisper_chunks_")
    segments = []
    offset = 0.0
    try:
        chunks = split_audio(args.ffmpeg, args.input, tmp, args.chunk)
        total = len(chunks)
        print(f"split into {total} chunk(s)", flush=True)
        for i, chunk in enumerate(chunks, 1):
            dur = wav_duration(chunk)
            print(f"[{i}/{total}] chunk {offset:.1f}s - {offset + dur:.1f}s", flush=True)
            result, _ = inference.transcribe(
                chunk, lambda *a, **k: None, None, *params.to_list()
            )
            for seg in result:
                segments.append((offset + seg.start, offset + seg.end, seg.text.strip()))
            offset += dur
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    out_dir = args.output or os.path.dirname(os.path.abspath(args.input))
    os.makedirs(out_dir, exist_ok=True)
    base = os.path.splitext(os.path.basename(args.input))[0]
    txt_path = os.path.join(out_dir, base + ".txt")
    srt_path = os.path.join(out_dir, base + ".srt")

    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(text for _, _, text in segments if text))
    with open(srt_path, "w", encoding="utf-8") as f:
        for idx, (start, end, text) in enumerate(segments, 1):
            f.write(f"{idx}\n{srt_timestamp(start)} --> {srt_timestamp(end)}\n{text}\n\n")

    print(f"Done: {len(segments)} segment(s)", flush=True)
    print(f"TXT: {txt_path}", flush=True)
    print(f"SRT: {srt_path}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())

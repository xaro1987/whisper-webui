import importlib.util
import sys

fails = []

# 1) Launcher patch present in the app source
try:
    from modules.whisper import data_classes
    with open(data_classes.__file__, encoding="utf-8") as f:
        if "default_compute_type" not in f.read():
            fails.append("compute-type patch missing from modules/whisper/data_classes.py")
except Exception as e:
    fails.append("cannot import modules.whisper.data_classes: %s" % e)

# 2) sitecustomize.py monkeypatches this module/class to pin the Whisper device
if importlib.util.find_spec("modules.whisper.faster_whisper_inference") is None:
    fails.append("modules.whisper.faster_whisper_inference not found (device pinning target)")

# 3) CTranslate2 must import and report its devices
try:
    import ctranslate2
    print("ctranslate2", getattr(ctranslate2, "__version__", "?"),
          "| cuda types:", ctranslate2.get_supported_compute_types("cuda"), flush=True)
except Exception as e:
    fails.append("import ctranslate2 failed: %s" % e)

if fails:
    print("SMOKE_FAIL", flush=True)
    for f in fails:
        print(" -", f, flush=True)
    raise SystemExit(1)

print("SMOKE_OK", flush=True)

// Single source of truth for the app version this launcher is tested against.
// Bump `commit` only after re-running the launcher (Install/Update -> smoke test
// + a GPU/CPU transcription) against the new upstream revision.
module.exports = {
  app: {
    repo: "https://github.com/jhj0517/Whisper-WebUI",
    commit: "c3bb3b18e959826b28b1192486a8d5b361b6a4e0",
  },
}

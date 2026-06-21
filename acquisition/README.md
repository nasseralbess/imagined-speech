# Acquisition

Recording imagined-speech EEG sessions from the Emotiv EPOC X via the Cortex API. Two UIs exist;
the **React app in `../frontend/`** is the current one — the files here are the original/standalone
stack plus the Cortex wrappers.

## Components

| File | Role |
|------|------|
| `server.py` | FastAPI server. Endpoints `/start_recording`, `/stop_recording`, `/save_log`. Drives the headset through `cortex.py`, writes stimulus params + logs, and asks Cortex to export the recording to `data/raw/`. |
| `cortex.py` | Emotiv Cortex API wrapper (Python). Upstream Emotiv code — kept as-is. |
| `recording.html` | Standalone stimulus + recording web page. Posts to `server.py` at `http://127.0.0.1:8000`. Predecessor of the React `frontend/`. |
| `js-cortex/` | Standalone Node/JS Cortex client experiments (`cortex.js` wrapper + `main.js`). Separate from the Python path above. |

## Running the server

```bash
cp ../.env.example ../.env       # set CLIENT_ID / CLIENT_SECRET (Emotiv app credentials)
pip install fastapi uvicorn
uvicorn server:app --app-dir . --reload     # serves on http://127.0.0.1:8000
```

Then open `recording.html` (or run the React `frontend/`) and start a session. Recordings are
exported to `data/raw/` (override with the `EXPORT_FOLDER` env var) and event logs to
`data/logs/<subject>/`.

## Credentials

`server.py` reads `CLIENT_ID` / `CLIENT_SECRET` from the environment (auto-loaded from the repo-root
`.env`). The JS client reads `js-cortex/config.js` (copy from `config.example.js`). Both secret
files are git-ignored.

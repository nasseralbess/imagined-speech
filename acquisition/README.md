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
exported to `data/raw/` (override with the `EXPORT_FOLDER` env var), stimulus params to
`data/raw/<subject>_<run_id>_params.json`, and event logs to `data/logs/<subject>/`. All three
paths resolve from the repo root, not the working directory.

## Experiments

The React frontend has an **Experiment** dropdown; the choice is recorded in the params JSON
(`"experiment"`) so every run is self-describing. Stimulus lists and trial construction live in
`frontend/src/experiments.js`.

| id | Design |
|----|--------|
| `legacy` | The original: 12 homophone-pair words, then 14 synonym/direction words, each block shuffled flat, per trial. Produced everything currently in `data/raw/`. |
| `directional` | **Exp 1** — Up/Down/Left/Right every trial plus 3–4 fillers drawn fresh from the battery. Fillers are never a target or related to one, so `Write` (homophone of `Right`) and `Correct` (synonym) can never appear. |
| `crossover` | **Exp 2** — five target/homophone/synonym sets (`Pair/Pear/Couple`, `Right/Write/Correct`, `Sea/See/Ocean`, `Night/Knight/Evening`, `Flower/Flour/Blossom`) plus 3–4 fillers. Strictly directional words are excluded entirely. |

Filler selection guarantees no trial contains both halves of any pair — otherwise the distractors
would smuggle the very phonetic/semantic structure the experiments isolate back into the trial.
`experiments.js` declares every relation once in `HOMOPHONE_PAIRS` / `SYNONYM_PAIRS` and derives
the exclusions from them, so adding a word to a pair automatically keeps it away from related
targets.

Presentation and logging are unchanged across all three: each word is shown as
`+` → word in **lightblue** (overt) → `+` → word in **blue** (covert). `preprocessing/produce_dataset.py`
parses the log *text* — it needs `Updated display to '<word>' with text color '<colour>'`, the
substring `cross` in the fixation line, and stimuli that are single `\w+` tokens. Those are a hard
contract; anything else in the log is ignored by it.

> **Before epoching new recordings:** `produce_dataset.py`'s `label_map` is a hardcoded 20-word
> dict. The Exp 2 words `Correct`, `Ocean`, `Evening`, `Blossom`, the neutral fillers, and the
> already-unlabelled `Fast` / `Large` all need adding there first.

## Credentials

`server.py` reads `CLIENT_ID` / `CLIENT_SECRET` from the environment (auto-loaded from the repo-root
`.env`). The JS client reads `js-cortex/config.js` (copy from `config.example.js`). Both secret
files are git-ignored.

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

Experiments 1 and 2 both draw on the same four **crossover sets** — words carrying *both* a direct
homophone and a direct synonym:

| target | homophone | synonym |
|--------|-----------|---------|
| Plain  | Plane     | Simple  |
| Steal  | Steel     | Rob     |
| Pair   | Pear      | Couple  |
| Fair   | Fare      | Just    |

| id | Design |
|----|--------|
| `legacy` | The original: 12 homophone-pair words, then 14 synonym/direction words, each block shuffled flat, per trial. Produced everything currently in `data/raw/`. |
| `directional` | **Exp 1** — directions alternating with crossover words: `Up` → intermediate → `Down` → intermediate → … Each trial draws all four intermediates from **one** set, and since a set has 3 words for 4 slots the target is drawn twice (`{Plain, Plain, Plane, Simple}`). Directions and intermediates are shuffled independently before interleaving, so the direction↔intermediate pairing varies per trial. Sets alternate strictly across trials from a random start. |
| `crossover` | **Exp 2** — each set yields two two-word pairs, one semantic (`Pair`/`Couple`) and one phonetic (`Pair`/`Pear`). A trial runs all 8 pairs in random order, with the order *within* each pair randomised too. Per trial each target appears twice, each counterpart once. |

Per-trial epoch yield (multiply by the Trials field):

| | Exp 1 | Exp 2 |
|---|---|---|
| words shown | 8 | 16 |
| each direction | 1× | — |
| each set target | 2× (in its own trial) | 2× |
| each counterpart | 1× (in its own trial) | 1× |
| ~duration @ 0.25/1.0 | 20 s | 40 s |

Presentation and logging are unchanged across all three: each word is shown as
`+` → word in **lightblue** (overt) → `+` → word in **blue** (covert). `preprocessing/produce_dataset.py`
parses the log *text* — it needs `Updated display to '<word>' with text color '<colour>'`, the
substring `cross` in the fixation line, and stimuli that are single `\w+` tokens. Those are a hard
contract; anything else in the log is ignored by it.

> **Before epoching new recordings:** `produce_dataset.py`'s `label_map` is a hardcoded 20-word
> dict built for the legacy vocabulary. `Up`/`Down`/`Left`/`Right` and `Pair`/`Pear`/`Couple` are
> already in it; the other nine crossover words — `Plain`, `Plane`, `Simple`, `Steal`, `Steel`,
> `Rob`, `Fair`, `Fare`, `Just` — are not, and must be added before Exp 1 or Exp 2 recordings can
> be epoched.

## Credentials

`server.py` reads `CLIENT_ID` / `CLIENT_SECRET` from the environment (auto-loaded from the repo-root
`.env`). The JS client reads `js-cortex/config.js` (copy from `config.example.js`). Both secret
files are git-ignored.

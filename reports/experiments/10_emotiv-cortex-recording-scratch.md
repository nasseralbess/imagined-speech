# 10 · Emotiv Cortex recording scratch — `10_emotiv-cortex-recording-scratch.ipynb`

> A scratch **data-acquisition** notebook (not analysis). It drives the Emotiv Cortex API to record
> and export a session for a single stimulus word, plus a few cells that inspect an exported CSV.
> This is the notebook-form predecessor of `acquisition/server.py`.

**Data inputs:** live headset (Cortex API); an exported `data/raw/Yousef Rihani …csv` for inspection.
**Artifacts produced:** would export a CSV recording (none produced in the saved run).

## Experiments / steps

### E1 · Cortex recording session
- **Method:** `cortex.Cortex` wrapper via a `Record` class with bound callbacks; records
  `['EEG','MOTION','PM','BP']` and exports CSV (V2).
- **Result:** authorised successfully but **recorded nothing** — no headset connected
  (`queryHeadsets` returned `[]`).
- **Verdict:** instrument-control utility; superseded by `acquisition/`.

### E2 · CSV inspection
- **Method:** load an exported recording with pandas; check timestamps.
- **Finding:** an exported CSV is **7911 rows × 169 columns** (EEG + MOTION + PM + POW band-power).

## Caveats / notes
- ⚠ **Security:** the saved notebook leaks a hardcoded Emotiv `client_id`/`client_secret`, license
  key, and a live `cortexToken` JWT in source and cell output. These should be **rotated**, and
  credentials kept in `.env` (as `acquisition/server.py` now does). The notebook outputs were left
  intact as an experiment artifact — do not commit refreshed tokens here.

# Imagined Speech EEG Decoding

Decoding **imagined (covert) speech** of directional words — *up / down / left / right* (and a
larger 20-word vocabulary) — from scalp EEG recorded with an **Emotiv EPOC X** headset via the
**Cortex API**. The project spans the full stack: stimulus presentation + data acquisition,
signal preprocessing, dataset generation, and a large body of classification / sequence-modelling
experiments.

> **Status:** research / exploratory. Most classifiers currently sit around chance for covert
> speech — see the experiment log for the honest results. The repo's value is the **data**, the
> **preprocessing pipeline**, and the **documented record of everything tried**.

---

## Repository layout

```
imagined-speech/
├── acquisition/        # Record EEG from the headset (stimulus UI + Cortex API + server)
│   ├── server.py           FastAPI server: drives Cortex, exports recordings to data/raw/
│   ├── cortex.py           Emotiv Cortex API wrapper (Python)
│   ├── recording.html      Standalone stimulus/recording web UI (talks to server.py)
│   └── js-cortex/          Standalone JS Cortex client experiments (cortex.js + node)
│
├── frontend/           # React stimulus-presentation app (the current acquisition UI)
│
├── preprocessing/
│   └── produce_dataset.py  Turn the cleaned pickle into model-ready .npz feature sets
│
├── notebooks/          # All experiment notebooks, renamed by what they contain (01..10)
│
├── data/
│   ├── raw/                Emotiv CSV recordings + per-run params JSON
│   ├── logs/               Per-subject stimulus event logs (timestamps + shown word/colour)
│   │   └── _misc/          Early/scratch logs (sethjs, _run1)
│   └── processed/          Generated datasets (*.npz) + cleaned pickle (*.pkl, git-lfs)
│
├── models/             # Saved model weights (best_model.pt/.pth, best_classifier.pt)
│
├── reports/
│   ├── experiments/        Per-notebook experiment logs (see docs/EXPERIMENT_LOG.md index)
│   ├── eeg-html/           Interactive MNE/Plotly QA reports per recording
│   ├── figures/            Static figures (psd.png, …)
│   └── catboost/           CatBoost training telemetry
│
└── docs/               # EXPERIMENT_LOG.md (master log) + research notes (NOTE, todo, UNEXPLORED)
```

## The pipeline, end to end

1. **Acquire** — `acquisition/` (or the React `frontend/`) presents word stimuli and records via
   the Cortex API. Raw CSVs land in `data/raw/`; a timestamped event log per run lands in
   `data/logs/<subject>/`.
2. **Clean** — `notebooks/03_preprocessing-ica-pca-pipeline.ipynb` is the canonical preprocessing
   pipeline: channel pruning, referencing, band-pass filtering, ICA artifact removal and PCA. It
   writes the large per-recording pickle `data/processed/processed_data_pca.pkl`.
3. **Build datasets** — `preprocessing/produce_dataset.py` consumes that pickle and the event logs
   to epoch the data around speech events and emit model-ready arrays into `data/processed/*.npz`.
4. **Model / analyse** — the `notebooks/` train and evaluate classifiers and sequence models on
   those `.npz` files.

## Quick start

```bash
# 1. Install Python deps
pip install -r requirements.txt

# 2. (Acquisition only) configure credentials
cp .env.example .env            # fill in Emotiv CLIENT_ID / CLIENT_SECRET
uvicorn server:app --app-dir acquisition --reload   # start the recording server

# 3. Regenerate a dataset from the cleaned pickle (run from repo root)
python preprocessing/produce_dataset.py --type gamma --pca
#   --type {gamma,dual_band,unfiltered}  --pca  --overt  --all_labels
#   outputs land in data/processed/
```

## Where to read about the experiments

Every notebook contains **multiple** experiments. They are documented, with extracted results,
in **[`docs/EXPERIMENT_LOG.md`](docs/EXPERIMENT_LOG.md)** (master index) and the per-notebook files
under [`reports/experiments/`](reports/experiments/). Start with the master log.

## Notes

- `data/processed/processed_data_pca.pkl` is ~1.4 GB and tracked via **git-lfs**.
- Secrets (`.env`, `acquisition/js-cortex/config.js`) are git-ignored; templates are committed.
- `acquisition/cortex.py` / `acquisition/js-cortex/cortex.js` are the upstream Emotiv Cortex
  wrappers and are kept as-is.

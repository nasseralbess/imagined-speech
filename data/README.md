# Data

EEG recordings, stimulus event logs, and generated datasets for the imagined-speech project.

## `raw/`
Direct Emotiv EPOC X exports from the Cortex API, one set per recording run:

- `*.md.pm.bp[.mc.fe].csv` — the EEG recording. Suffixes are Emotiv stream sets
  (`md`=motion, `pm`=performance metrics, `bp`=band power, `mc`=mental commands, `fe`=facial
  expression). Recordings are a mix of **128 Hz and 256 Hz** sample rates.
- `*_params.json` — the stimulus sequence and timing parameters for that run.
- `*.json` — Emotiv metadata sidecars.

EEG channels are the 14 EPOC X electrodes (10-20 names: AF3, F7, F3, FC5, T7, P7, O1, O2, P8, T8,
FC6, F4, F8, AF4). Useful columns start with `EEG.` (the rest — `CQ.`, `EQ.`, `MOT.`, `PM.`, `MC.`,
`FE.` — are quality/motion/metric streams; see `reports/experiments/02_*` for the keep/drop rationale).

## `logs/`
Per-subject stimulus event logs written during recording (`<subject>/<subject>_run<id>.txt`). Each
line is `[ISO-timestamp] <message>`; the messages drive epoching:

- `Updated display to '<word>' with color '<colour>'` — `blue` = **covert** (imagined) trial,
  `orange`/`lightblue` ≈ **overt** (spoken) trial.
- `'+'` (black cross) — fixation between trials.

`logs/_misc/` holds early/scratch logs (`sethjs_*`, `_run1`) kept for provenance.

## `processed/`
Generated, model-ready artifacts (not raw):

- `processed_data_pca.pkl` (~1.4 GB, **git-lfs**) — per-recording cleaned dicts (raw, processed,
  PCA components, epochs, sfreq, start timestamp). Produced by
  `notebooks/03_preprocessing-ica-pca-pipeline.ipynb`.
- `*.npz` — epoched feature sets produced by `preprocessing/produce_dataset.py`, named
  `{band}_{covert|overt}_{pca|no_pca}[_all_labels].npz`, each holding `X` (trials × channels ×
  time) and `y` (integer word labels). `all_labels_*_gfp_*` use global-field-power features; the
  4-class label map is `{up:0, down:1, left:2, right:3}`.
- `X_swarm_experiment.npz` — features saved by the swarm-optimisation experiment in notebook 05.

### Regenerating
```bash
python preprocessing/produce_dataset.py --type gamma --pca   # run from repo root
```
Requires `processed/processed_data_pca.pkl` and the `logs/`. The 22 source recordings used are
the `files_256` list inside `produce_dataset.py`.

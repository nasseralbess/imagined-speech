# Experiment Log — everything tried, and how it went

A consolidated, honest record of every experiment in this project. Each notebook contains **multiple**
experiments; this file is the index and the cross-cutting summary. Per-notebook detail (with extracted
metrics) lives in [`reports/experiments/`](../reports/experiments/).

**The task.** Decode imagined ("covert") speech of directional words — **up / down / left / right**
(4-class, chance = 25%) — and a 20-word vocabulary, from 14-channel Emotiv EPOC X EEG. A parallel
thread tests whether covert EEG can be *translated* into overt (spoken) EEG.

**Bottom line.** No classifier reliably beats chance on covert direction. The strongest covert results
hover at chance (~22–35%); the covert→overt seq2seq does not learn. The overt-speech and feature/GA
directions are the least-bad. The lasting value is the **acquisition stack, the cleaned dataset, and
this record of what does/doesn't work** so the next attempt doesn't repeat it.

---

## Results at a glance

| # | Notebook | Experiment | Data | Model | Result | Verdict |
|---|----------|-----------|------|-------|--------|---------|
| 01 | preprocessing-signal-quality-qa | PSD / band-power / alpha-ERD QA | Aws Safi (3 runs) | — (analysis) | per-recording QA + HTML | n/a |
| 02 | data-quality-audit | column/recording keep-drop audit | all raw | — (analysis) | drop-list rationale (≈0.375 zero RawCq; MOT/PM/FE/MC useless) | n/a |
| 03 | preprocessing-ica-pca (canonical) | ICA+PCA clean → pickle | 22 recordings | pipeline | builds `processed_data_pca.pkl` | ✅ pipeline |
| 03 | ″ | gamma CNN sanity check | gamma covert | 1D-CNN | **test 18.82%** | ❌ < chance |
| 04 | event-log-timestamp-alignment | log→index alignment helper | 1 log | — | plumbing | n/a |
| 05 | covert-speech-direction-cnn | CNN-LSTM (4-class) | gamma covert | grouped 1D-CNN | **test 26.42%**, train→100% | ❌ overfit |
| 05 | ″ | band-combination sweep | per-band | — | dataset generation | n/a |
| 05 | ″ | paper feature-engineering + **GA (DEAP)** | engineered/GFP | RandomForest + GA | **test 0.354 / val 0.32–0.36** | ⚠ best-but-weak |
| 05 | ″ | conv autoencoder | unfiltered PCA | AE (2 epochs) | recon loss ~0.55 | ⏸ preliminary |
| 06 | covert-overt-spectrograms | raw windows → LSTM/XGB/LogReg | spectrograms | LSTM / XGB / LogReg | **LSTM 0.41**, XGB 0.28, LogReg 0.24 | ❌ ≤ majority (0.40) |
| 06 | ″ | spectrogram CV (LogReg/SVM), 2D-CNN, small LSTM | spectrograms | various | errored / interrupted / degenerate | ❌ |
| 07 | cnn-lstm-gamma-direction | CNN-LSTM (173,732 params) | gamma covert PCA | 1D-CNN+LSTM | **test 22.47%**, train→100% | ❌ overfit |
| 08 | one-vs-all-covert-up | "up" vs rest | gamma covert | LogReg / CatBoost / CNN / MLP | 0.77–0.79 acc, **0.00 recall on "up"** | ❌ base-rate collapse |
| 09 | covert-to-overt-seq2seq | translate covert→overt EEG | paired covert/overt | LSTM seq2seq | **val MSE flat ~1.318**, early-stop ep6 | ❌ doesn't learn |
| 10 | emotiv-cortex-recording-scratch | record a session | live headset | — (acquisition) | recorded nothing (no headset) | n/a |

Chance: 25% for 4-class direction, 5% for the 20-word vocabulary. Notebook 06's majority-class
baseline is ≈ 0.40 (Right-heavy split).

---

## Per-notebook index

| Notebook (in `notebooks/`) | Theme | Detailed log |
|---|---|---|
| `01_preprocessing-signal-quality-qa.ipynb` | Per-recording cleaning + QA, HTML reports | [01](../reports/experiments/01_preprocessing-signal-quality-qa.md) |
| `02_data-quality-audit-column-selection.ipynb` | Which recordings/columns to keep | [02](../reports/experiments/02_data-quality-audit-column-selection.md) |
| `03_preprocessing-ica-pca-pipeline.ipynb` | **Canonical** preprocessing → pickle | [03](../reports/experiments/03_preprocessing-ica-pca-pipeline.md) |
| `04_event-log-timestamp-alignment.ipynb` | Log↔EEG alignment helper (stub) | [04](../reports/experiments/04_event-log-timestamp-alignment.md) |
| `05_covert-speech-direction-cnn.ipynb` | Main workbench: CNN, band sweep, **GA**, AE | [05](../reports/experiments/05_covert-speech-direction-cnn.md) |
| `06_covert-overt-spectrogram-classifiers.ipynb` | Morlet spectrograms + classic ML | [06](../reports/experiments/06_covert-overt-spectrogram-classifiers.md) |
| `07_cnn-lstm-gamma-direction-classifier.ipynb` | CNN-LSTM on gamma | [07](../reports/experiments/07_cnn-lstm-gamma-direction-classifier.md) |
| `08_one-vs-all-covert-up-detection.ipynb` | Binary "up" detection | [08](../reports/experiments/08_one-vs-all-covert-up-detection.md) |
| `09_covert-to-overt-seq2seq-translation.ipynb` | covert→overt seq2seq | [09](../reports/experiments/09_covert-to-overt-seq2seq-translation.md) |
| `10_emotiv-cortex-recording-scratch.ipynb` | Acquisition scratch | [10](../reports/experiments/10_emotiv-cortex-recording-scratch.md) |

---

## What we learned

**Recurring failure mode — overfitting.** Every deep model (notebooks 03, 05, 07) drives train
accuracy to ~100% while test stays at chance and test loss climbs. The dataset is small
(~hundreds of trials), noisy (consumer 14-channel headset), and the gamma band as filtered carries
little class-separable structure.

**Class imbalance bites the binary reframing.** The one-vs-all "up" detector (08) reports 77–79%
"accuracy" that is pure base rate — recall on the target class is 0.00 across LogReg, CatBoost, CNN
and MLP. Weighted loss didn't rescue it.

**Classic ML ≈ deep nets ≈ majority baseline.** Spectrogram features with XGBoost/LogReg/SVM (06)
do no better than the majority class; the best single number anywhere (LSTM 0.41 in 06) just matches
that baseline.

**Engineered features + GA are the least-bad supervised result.** The paper-style feature pipeline
plus DEAP genetic-algorithm selection (05) reaches ~0.35 — still weak, but the only thing that nudges
above an all-features baseline. (`X_swarm_experiment.npz` is this experiment's cache; "swarm" is a
misnomer — it's a genetic algorithm.)

**Covert→overt translation fails.** The seq2seq (09) flatlines (val MSE ~1.318) — evidence that the
covert signal as captured doesn't contain enough to reconstruct the overt one.

## Data-quality findings worth keeping (notebook 02)
- ~**37.5%** of every genuine recording has zero `EEG.RawCq` (a hardware ceiling); test/junk
  recordings sit near 0.99 — a quick real-vs-junk filter.
- `EEG.Interpolated` all-zero; `MOT.CounterMems` redundant with `EEG.Counter`; `MOT.*` is head
  motion not neural; `PM.*.IsActive` true for ~67/86,500 rows; `FE.*`/`MC.*` ~87%+ null.
- → keep only the 14 `EEG.*` channels (the drop-list in `alt_pipeline()`).

## Ideas not yet tried (see `docs/UNEXPLORED.md`, `docs/todo.txt`)
Per-channel seq2seq; high-gamma-only overt classifier as a feasibility gate; wavelet-transform inputs;
EQ-based epoch filtering; MFCC-style decomposition before epoching; transformers.

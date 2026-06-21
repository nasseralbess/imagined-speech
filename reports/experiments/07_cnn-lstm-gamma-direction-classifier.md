# 07 · CNN-LSTM gamma direction classifier — `07_cnn-lstm-gamma-direction-classifier.ipynb`

> A focused training notebook (despite the original name `clean.ipynb`): trains a 1D-CNN + LSTM to
> classify up/down/left/right from gamma covert PCA epochs. Overfits to chance.

**Data inputs:** loads a bare `gamma_epochs.npz` (⚠ this filename does **not** exist in the repo —
the real datasets live under `data/processed/`, e.g. `gamma_covert_pca.npz`).
**Artifacts produced:** none.

## Experiments / steps

### E1 · CNN-LSTM classifier (4-class)
- **Method / model:** 3× `Conv1d` (14→32→64→128) + MaxPool/Dropout, 2-layer `LSTM(128→64)`,
  `Linear(64, 4)` — **173,732 parameters**. StandardScaler + stratified split, CrossEntropy,
  Adam (lr 1e-3, weight_decay 1e-4), StepLR, 100 epochs, CPU.
- **Result:** **final test accuracy 22.47%** (n=89, below 25% chance). Train reaches **100%** while
  test loss climbs to ~5.0 — severe overfitting; macro-F1 0.21.
- **Verdict:** failed / chance-level.

### E2 · Stray cells
- A broken NLP bag-of-words snippet and a `NameError: name 'j'` cell are present and unrelated to the
  classifier.
- **Verdict:** dead code.

## Caveats / notes
- Fix the input path before re-running: point it at an existing `data/processed/gamma_*_pca.npz`.
- Same story as notebooks 03/05: the gamma CNN/CNN-LSTM family overfits and does not generalise.

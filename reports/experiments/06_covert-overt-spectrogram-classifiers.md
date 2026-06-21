# 06 · Covert/overt spectrogram classifiers — `06_covert-overt-spectrogram-classifiers.ipynb`

> Multi-subject direction decoding that rebuilds the dataset in-notebook from raw CSVs + logs, turns
> trials into **Morlet-wavelet spectrograms**, and throws a range of classifiers at them
> (LSTM, XGBoost, Logistic Regression, linear SVM, 2D-CNN). 56 cells, all code, no markdown.

**Data inputs:** raw Emotiv CSVs in `data/raw/` + event logs (many "Skipped, not found in logs").
**Artifacts produced:** none persisted to disk.

Spectrograms via `tfr_array_morlet`, `freqs = arange(1, 41)`, `n_cycles = freqs/2`, shape ≈
`(n_trials, 40 freqs, ~389 time)`. 4-class direction task (Down/Left/Right/Up), **imbalanced**
(e.g. Right = 36 of 90 test samples → majority baseline ≈ 0.40).

## Experiments

### E1 · Raw covert windows → LSTM + XGBoost + LogReg
- **Method:** Bi-LSTM (hidden 128, 2 layers, dropout 0.3, Adam 1e-3, 100 epochs) on padded, scaled
  sequences; XGBoost (100 trees, depth 6, lr 0.1) and LogisticRegression on per-channel
  mean/std/max/min features.
- **Result:** **LSTM best 0.4111** (overfits — test acc decays as train loss falls 1.33→0.54);
  **XGBoost 0.2778** (macro-F1 0.13, predicts majority); **LogReg 0.2444** (macro-F1 0.18).
- **Verdict:** all at/below the ~0.40 majority baseline — no genuine decoding.

### E2 · Spectrogram band-power → LogReg + linear SVM (5-fold CV)
- **Method:** flattened spectrogram features `(450, 472)`, StratifiedKFold CV with LogReg and SVM.
- **Result:** **errored** — `ValueError: All the 5 fits failed`; the combined LogReg+SVM CV cell
  produced no output.
- **Verdict:** failed (no usable result).

### E3 · 2D-CNN on spectrograms
- **Method / model:** `Conv2d(1,6,5)` → pool → `Conv2d(6,1,5)` → FC 94→120→84→4, batch size 1.
- **Result:** training ended in **KeyboardInterrupt** — no metric captured.
- **Verdict:** abandoned.

### E4 · Sequence LSTM (small)
- **Method / model:** LSTM hidden 32, 2 layers, Adam 1e-3, batch 1, 30 epochs w/ early stop.
- **Result:** **degenerate** — frozen at Train 0.2012 / Val 0.2000 with identical loss each epoch;
  `KeyboardInterrupt` at epoch 3. Collapsed to a single class.
- **Verdict:** failed.

### E5 · Spectrogram visualisation / averaging (support)
- **Method:** per-label spectrogram averages and plots; shape checks
  (`Down (118,40,389)`, averages `(118,40,391)`).
- **Verdict:** exploratory support only.

## Caveats / notes
- The dataset is rebuilt from scratch here rather than loading the `.npz` files — slow and
  duplicative of `produce_dataset.py`.
- Class imbalance is unaddressed; "best" LSTM (0.41) barely matches the majority baseline.
- Several cells were interrupted/errored, so this notebook's results are partial by design.

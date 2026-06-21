# 08 · One-vs-all covert "up" detection — `08_one-vs-all-covert-up-detection.ipynb`

> Reframes the 4-class direction task as a binary problem — imagined word **"up" (label 0) vs the
> rest** — on gamma covert EEG, and tries several models. The recording is heavily imbalanced
> (~21% "up" in the test split), and every model collapses to the majority class.

**Data inputs:** `gamma_covert_no_pca.npz` (X ≈ 526 × 14 channels × 154 time; y 4-class → binarised).
**Artifacts produced:** none.

Features: GFP (per-timepoint std across channels) → `(526, 154)`; `StandardScaler`; class-imbalance
handled with `CrossEntropyLoss(weight=[1.0, 8.0])`. Runs on Apple MPS.

## Experiments

### E1 · Logistic Regression (GFP features)
- **Result:** **accuracy 0.79** but **recall on "up" = 0.00** (macro-F1 0.44) — predicts all-majority.
- **Verdict:** failed (base-rate classifier).

### E2 · CatBoost (GFP features)
- **Result:** **accuracy 0.77**, again **recall on "up" = 0.00** (macro-F1 0.44).
- **Verdict:** failed (slightly worse than LogReg, same collapse).

### E3 · Conv1d + LSTM autoencoder (anomaly-detection framing)
- **Method:** train an autoencoder on the majority class, threshold per-sample reconstruction MSE to
  flag the minority.
- **Result:** training cell commented out — **no detection metric captured**.
- **Verdict:** abandoned.

### E4 · Grouped-Conv1d "CNN" (LSTM disabled)
- **Method / model:** `CNN_LSTM_Classifier`, 100 epochs, weighted loss.
- **Result:** **frozen** at Train 68.10% / Test 64.15% for all 100 epochs; loss never moves (~0.696).
- **Verdict:** failed (collapsed to base rate).

### E5 · Plain MLP (2156 → 4312 → 1078 → 2, Softmax)
- **Method:** this is the `model2` the E4 training loop actually optimises.
- **Result:** same frozen **64.15%** test accuracy. (Note: the NN train/test labels are misaligned —
  the loop reuses E1's GFP split labels.)
- **Verdict:** failed.

## Caveats / notes
- Headline: **zero real "up" detection** — accuracy numbers (0.77–0.79) are just the class base rate.
- The one-vs-all reframing does not rescue the signal; the limiting factor is the data, not the model.
- Label-alignment bug between the sklearn and torch sections means the NN metrics are not trustworthy
  even as reported.

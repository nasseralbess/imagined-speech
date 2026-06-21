# 05 · Covert-speech direction decoding & optimisation — `05_covert-speech-direction-cnn.ipynb`

> The richest notebook in the repo (~131 cells). It decodes the *direction* of imagined ("covert") speech — 4 classes up/down/left/right — from 14-channel Emotiv EPOC X EEG. It runs an end-to-end MNE preprocessing pipeline (filter → ICA → PCA → epoch), produces GFP visualisations, sweeps frequency-band combinations to generate datasets, trains a grouped 1D-CNN ("CNN-LSTM" with the LSTM disabled), reimplements a paper's hand-crafted feature pipeline (Hjorth/statistical/wavelet/rhythm features → 448-d vector), runs a DEAP **genetic-algorithm feature-selection** experiment (the artifact is `X_swarm_experiment.npz`), and trains a denoising convolutional auto-encoder. Most decoders land at or near chance (~25–30 %); the GA nudges validation accuracy slightly above an all-features baseline.

**Data inputs:** `processed_data_pca.pkl` (pickled per-subject MNE pipeline output); 22 raw Emotiv CSVs + matching `data_logs/.../*.txt` event logs (when regenerating); `all_channels_no_pca.npz`; `gamma_epochs_no_pca.npz`; `unfiltered_covert_pca.npz`; `unfiltered_covert_pca_all_labels.npz`; `all_labels_covert_gfp_no_pca.npz`; `X_swarm_experiment.npz` (load path, commented).
**Artifacts produced:** `gamma_delta_no_pca.npz` (active `np.savez_compressed`); commented-out saves: `gamma_{delta,theta,alpha,beta}_no_pca.npz` band-sweep, `X_swarm_experiment.npz`, `processed_data_pca.pkl`. (No model `.pt`/`.pth` is saved from inside this notebook; `models/best_model.pt`, `best_model.pth`, `best_classifier.pt` exist in the repo but are not written here.) Many cells emit Matplotlib PNG figures (GFP curves, training curves, confusion matrix) embedded in the notebook.

## Experiments

### E1 · MNE preprocessing pipeline (filter → ICA → PCA → epoch)
- **Goal:** Turn 22 raw Emotiv recordings into clean, epoched, PCA-reduced data per subject.
- **Method / model:** Per file: `alt_pipeline` CSV load + EEG-column selection; `RawArray` with `standard_1020` montage; events built from coloured log markers (blue→covert=1, red→overt=2, black/cross→fixation=3); bandpass **1–64 Hz** (firwin); amplitude reject `eeg=200e-6`; `ICA(n_components=14, method='picard', random_state=15)` with per-file `exclude` component lists; `PCA(n_components=14)`; re-epoch. Output stored as dicts with keys `processed/sfreq/start_timestamp/raw/events/epochs/epochs_cleaned/pca`.
- **Key params:** 14 EEG channels; sfreq ~128 Hz; epoch window -0.199 to 0.5 s, baseline -0.199–0 s; 22 per-file ICA exclude lists.
- **Result:** Produces `processed_l`; e.g. subject 0 has 130 covert / 130 overt / 333 fixation events; an Epochs repr shows 593 total events. A worked epoch tensor reaches `(94, 14, 180)`. No classification metric (it is data prep).
- **Verdict:** worked (data-prep stage; regenerates `processed_data_pca.pkl`).

### E2 · GFP (Global Field Power) visualisations by direction
- **Goal:** Inspect whether the 4 directions (and a 20-word vocabulary) produce visually distinct field-power time courses.
- **Method / model:** `gfp(data)=data.std(axis=0, ddof=0)`; per-class averages plotted (`plt.plot(gfp(np.average(class_epochs, axis=0))*1e6)`); also `mne.viz.plot_compare_evokeds` across covert/overt/fixation ("combining channels using GFP").
- **Key params:** classes up/down/left/right = y 0/1/2/3; also loops a 20-word list (son/pear/sun/sea/flower/pair/see/night/right/knight/write/flour/down/smart/big/left/couple/quick/up/clever).
- **Result:** Figures only (PNG, not quantified). Plot-compare logs show heavy single-channel rejection, predominantly `['AF4']`. No numeric result captured.
- **Verdict:** inconclusive (qualitative visualisation only).

### E3 · Frequency-band-combination sweep (dataset generation)
- **Goal:** Generate gamma+second-band epoch datasets to test which band pairing best supports direction decoding.
- **Method / model:** `extract_gamma(..., second_band=...)` filters raw to gamma (30–64 Hz, firwin) and optionally vstacks a second band's epochs; covert events only; window tmin=-0.4, tmax=0.8; downsample `::2` if >200 samples. Loop `for band in ['delta','theta','alpha','beta']` → `np.savez_compressed(f"gamma_{band}_no_pca.npz", ...)`. A separate active cell saves `gamma_delta_no_pca.npz`.
- **Key params:** bands delta(0.5–4) theta(4–8) alpha(8–12) beta(12–30) gamma(30–64); label_map up/down/left/right (a binary up/down vs left/right map is present but commented).
- **Result:** The sweep cell is commented out but retains its run log: per-subject/per-band MNE filter-design messages and epoch shapes (mostly `(25, 14, 154)`), plus recurring "Skipping epoch … (out of bounds)" lines. **No classification metrics** — this is pure dataset generation. (The corresponding band-pair `.npz` files exist in `data/processed/`, both PCA and no-PCA variants.)
- **Verdict:** worked as data-prep; no accuracy attached.

### E4 · Grouped 1D-CNN ("CNN-LSTM") direction classifier — run A (no augmentation)
- **Goal:** Decode 4-way direction from gamma-band epochs with a depthwise/grouped 1D CNN.
- **Method / model:** `CNN_LSTM_Classifier`: `Conv1d(14→28, k=16, groups=14)` → `Conv1d(28→56, k=32, groups=28)` → `AvgPool1d(2)` → `Conv1d(56→128, k=32, groups=1)` → `Dropout(0.3)` → mean over time → `Linear(128→4)`. (LSTM layers defined but commented out.) ~232,344 parameters.
- **Key params:** input 14ch × 154 samples; `CrossEntropyLoss`; `Adam(lr=1e-3, weight_decay=1e-4)`; `StepLR(step=50, gamma=0.5)`; batch 16; up to 100 epochs; split test_size=0.2, stratify, random_state=42.
- **Result:** Training interrupted (`KeyboardInterrupt`). Captured: Epoch 0 train 37.7 % / test 40.0 %; Ep10 39.7 % / 40.0 %; Ep20 43.3 % / 37.3 %. No final report for this run.
- **Verdict:** inconclusive (interrupted; hovering near chance).

### E5 · Grouped 1D-CNN final evaluation (`model2`)
- **Goal:** Full train + final report/confusion-matrix for the same architecture.
- **Method / model:** Same `CNN_LSTM_Classifier`; `model2`; final `classification_report` + confusion matrix + per-class accuracy plots; "model summary" printout.
- **Key params:** same optimiser/scheduler; 100 epochs; described as "Gamma 30–100 Hz, 1D CNN + LSTM, 232,344 params".
- **Result:** **Final test accuracy 26.42 %** (n=106, 4 classes ≈ 25 % chance). Per-class: up 23.8 %, down 23.8 %, left 4.8 %, right 39.5 %. Confusion matrix `[[5 1 8 7],[4 5 0 12],[3 3 1 14],[10 6 10 17]]` (model collapses toward "right"). macro-F1 ≈ 0.23.
- **Verdict:** chance-level / failed.

### E6 · Grouped 1D-CNN with noise augmentation (`model2`, augmented train)
- **Goal:** Test whether Gaussian-noise augmentation of the training set helps generalisation.
- **Method / model:** `augment_with_noise(X_train, y_train, n_augment=2, noise_level=0.05)` (noise scaled to per-epoch mean abs amplitude); same CNN, 100 epochs.
- **Key params:** noise_level 0.05; n_augment 2; batch 16; Adam lr 1e-3.
- **Result:** Severe overfitting — train climbs 39 %→**100 %** by ~Ep30 while test stays ~24–29 % (Ep99 train 100 % / test 26.42 %, test loss rising to ~7.4).
- **Verdict:** failed (overfit; no test-set gain over chance).

### E7 · Paper-based hand-crafted feature pipeline
- **Goal:** Reproduce a referenced paper's feature set (markdown header: "Experiments with feature selection from the recommended paper") to feed a classical/optimised classifier.
- **Method / model:** Per-channel features assembled into a `pandas` DataFrame then flattened: Hjorth **Activity/Mobility/Complexity**; **Kurtosis**, 2nd-difference mean/max; **coefficient of variation**; **skewness**, 1st-difference mean/max; **wavelet** features via `pywt.dwt(...,'coif1')` (mean/std/energy/entropy of cA & cD); **rhythm-band** features via Butterworth `butter`+`filtfilt` per band (mean/std/energy/entropy for alpha/beta/gamma/delta/theta); **slope** mean & variance (vertex-to-vertex via `argrelextrema`). Uses `nitime`, `spectrum`, `pywt`, `scipy`. Final `X_new` → `MinMaxScaler`.
- **Key params:** rhythm bands delta(0.5–4)…gamma(30–64), filter order 5, entropy epsilon 1e-10; input `unfiltered_covert_pca.npz`.
- **Result:** Feature matrix shape **(526, 448)** after MinMax scaling. Several feature columns are degenerate constants (e.g. col 441=1.0, 442=0.577, 445=1.0) or ~0. No standalone accuracy at this stage (feeds E8). A `DeprecationWarning` for `scipy.stats.stats.skew` is emitted.
- **Verdict:** worked (feature construction); evaluated downstream in E8.

### E8 · Genetic-algorithm feature selection (DEAP) — "swarm" experiment
- **Goal:** Select an optimal subset of the 448 features to maximise RandomForest direction accuracy. (Saved data artifact is `X_swarm_experiment.npz`; despite the "swarm" filename, the optimiser implemented is a **genetic algorithm**, not particle-swarm.)
- **Method / model:** DEAP `eaSimple`. Individual = 448-bit mask; fitness = `RandomForestClassifier(n_estimators=100)` accuracy on the selected columns (`getFitness` drops zero-mask columns, one-hot via `get_dummies`, aligns train/test columns). HallOfFame, statistics (avg/std/min/max), metrics via percentile + validation re-evaluation; best subsets plotted with cubic-spline interpolation (`interpolate.splrep(s=5.0)`). `scoop.futures` imported for parallelism.
- **Key params:** numPop=100, numGen=10, cxpb=0.5, mutpb=0.2, `cxOnePoint`, `mutFlipBit(indpb=0.05)`, `selTournament(tournsize=3)`; data split 0.10 validation then 0.10 test, random_state=69.
- **Result:** Baseline RF (all 448 features): **test acc 0.354 / validation acc 0.321**. GA generation max improves 0.458 → **0.479** by gen 10 (avg ~0.40). Best validation subsets: **0.358 (239 features)** and a **227-feature** subset — i.e. GA validation acc (0.358) marginally beats the all-features baseline (0.321) using ~half the features. (4-class chance ≈ 0.25.) `X_swarm_experiment.npz` save/load are present but commented.
- **Verdict:** worked but weak — small absolute gain over baseline, still far below useful accuracy.

### E9 · Denoising convolutional auto-encoder
- **Goal:** Learn an unsupervised compressed representation of covert-speech epochs (denoising AE), tracking conv-filter evolution.
- **Method / model:** `AutoEncoder` — encoder `Conv1d 14→64→128→256→512` (kernels 7,5,5,5, mostly 'same') → `AdaptiveAvgPool1d(1)` → `Linear(512→encoding_dim)`; decoder mirrors via `Linear`→`Unflatten`→`ConvTranspose1d 512→256→128→64→14`→`Sigmoid`. Denoising: Gaussian noise added to inputs each batch; `conv1.weight` snapshotted per batch.
- **Key params:** encoding_dim=1024; input `unfiltered_covert_pca_all_labels.npz`; `SmoothL1Loss(beta=0.05)`; `Adam(lr=0.05, weight_decay=1e-4)`; `StepLR(step=50, gamma=0.5)`; batch 16; **num_epochs=2**; split 0.2 test, stratify, random_state=69, StandardScaler.
- **Result:** Epoch 0 train 0.5537 / test 0.5666; Epoch 1 train 0.5518 / test 0.5666 (barely moving in 2 epochs). Total |conv1| weight change across training = **155.43**. A single conv1 weight trajectory (`[53,2,6]`) is plotted.
- **Verdict:** inconclusive (only 2 epochs; reconstruction loss essentially flat).

### E10 · GFP-dataset load (all-labels)
- **Goal:** Make a GFP-collapsed all-labels dataset available for downstream use.
- **Method / model:** `np.load('all_labels_covert_gfp_no_pca.npz')`.
- **Key params:** —
- **Result:** `X_gfp` shape **(526, 154)**. Loaded but no model trained on it within the captured cells.
- **Verdict:** inconclusive (loaded, not used for a reported metric here).

## Caveats / notes
- **Naming vs. method:** The owner mentioned "swarm/particle-swarm optimisation," but the only optimiser actually implemented is the DEAP **genetic algorithm** (E8). The PSO terminology survives only in the artifact name `X_swarm_experiment.npz`. `scoop.futures` is imported (intended parallelism) but no PSO loop exists in the notebook. If a true PSO was intended, it is not present.
- **Two `extract_gamma` variants:** one filters to gamma (band-sweep cell); the "All Channels" variant has the gamma filter commented out, so it epochs the *unfiltered* signal — naming of derived files may therefore be misleading.
- **Model summary text is partly inaccurate:** the CNN is printed as "1D CNN + LSTM, Gamma 30–100 Hz" but the LSTM layers are commented out and the gamma band defined elsewhere is 30–64 Hz.
- **Decoding outcome:** every supervised direction decoder (E4–E6) and the GA-selected RF (E8) sit at or only marginally above 4-class chance (~25 %), with consistent collapse toward the "right" class and strong overfitting once augmented.
- **Reproducibility:** several heavy cells (band sweep, `X_swarm_experiment.npz` save/load, pickle dump) are commented out; their outputs are stale captures from prior runs. Many results are PNG figures (GFP curves, training curves, confusion matrix) not reproduced numerically here.
- **Mixed `random_state`s** across experiments (42, 69) and varying splits (0.2 vs nested 0.10) mean the numbers are not strictly comparable across experiments.

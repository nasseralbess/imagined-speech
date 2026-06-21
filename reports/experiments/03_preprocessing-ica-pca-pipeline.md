# 03 · EEG preprocessing: ICA + PCA pipeline (canonical) — `03_preprocessing-ica-pca-pipeline.ipynb`

> The canonical preprocessing notebook for the Emotiv EPOC X imagined/overt-speech dataset. It builds an MNE `Raw` from each Emotiv CSV, prunes to the 14 EEG channels, band-pass filters, epochs against the experiment event log (covert/overt/fixation), fits per-recording ICA with hand-curated component exclude-lists, applies PCA, and saves the cleaned per-recording objects to `processed_data_pca.pkl`. It also extracts gamma-band (30–64 Hz) covert-direction epochs to `gamma_epochs_no_pca.npz` and runs a CNN sanity-check classifier on them. Most cells in the middle are exploratory diagnostic plots (ERP/band overlays). The notebook is entirely code — no markdown cells. Several cells are run-order-dependent and show stale `NameError`s in their saved outputs.

**Data inputs:**
- Emotiv EPOC X exported CSVs in `data/` (channels `EEG.AF3 … EEG.AF4`, plus POW.* band-power, MOT.*, CQ/EQ quality, FE.* facial-expression, PM.* performance-metric columns). Two sampling rates present: **~128 Hz** (older `.md.pm.bp.csv` recordings) and **~256 Hz** (newer `.md.pm.bp.mc.fe.csv` recordings).
- Experiment event logs in `data_logs/<name>/<name>_run<id>.txt` — timestamped lines marking fixation cross (`+`, black), overt cue (`lightblue`→mapped red), and covert cue (`blue`). Timestamps shifted +3h to match recording clock.
- A primary single recording driving the diagnostics: `Malak Tamimi…1748950961776…` (id `1748950961776`).
- A curated list of 22 recordings (`files_256`) used to build the batch artifacts.

**Artifacts produced:**
- `processed_data_pca.pkl` — pickled list of 22 dicts, each `{processed, sfreq, start_timestamp, raw, events, epochs, epochs_cleaned, pca}` (cell 41).
- `gamma_epochs_no_pca.npz` — `X` (gamma covert-direction epochs) and `y` (up/down/left/right labels) (cell 51). Shape per recording `(n, 14, 154)` after downsampling 256 Hz recordings by `[::2]`.
- (Referenced but NOT written here) `gamma_epochs_pca.npz` is *loaded* in cell 54 — produced elsewhere; this notebook only reads it.

## Pipeline steps / experiments

### S1 · Event-log parsing (single recording)
- **Goal:** Turn the run log into `(timestamp, color, description)` tuples for event creation.
- **Method:** `add_three_hours` + `mp` color-mapper; parse lines containing `blue` or `+`. Cells 0–3.
- **Key params:** maps `'blue'`→blue (covert), `'lightblue'`→red (overt), else→black (fixation).
- **Result:** `logs["1748950961776"]` populated; histogram (cell 3) shows 80 events per time-bin across 10 bins (≈800 log lines). Cell 1's saved output shows a stale `NameError: name 'log' is not defined` (run-order artifact).
- **Verdict:** Works; produces the event list used downstream.

### S2 · CSV → cleaned DataFrame (`alt_pipeline`)
- **Goal:** Load a recording, drop non-EEG/metadata columns, and estimate sampling rate.
- **Method:** `alt_pipeline` drops ~60 MOT/CQ/EQ/PM/MC/marker columns; computes `sfreq = 1/median(diff(Timestamp))` with a 10–1000 Hz sanity guard (fallback 128 Hz); sets `Timestamp` as index. Cells 4–7.
- **Key params:** fallback `sfreq=128`.
- **Result:** Batch loop over `data/` (cell 6, 5 files skipped) prints per-file sfreq — recordings cluster at **128.074 Hz** and **256.141 Hz**.
- **Verdict:** Works; canonical loader reused everywhere.

### S3 · Build MNE Raw + montage (single recording)
- **Goal:** Construct an MNE `RawArray` of the 14 EEG channels with a 10-20 montage.
- **Method:** `eeg_only` selects `EEG.*` (minus Counter/RawCq); `mne.create_info` with channel names stripped of `EEG.` prefix; `standard_1020` montage (`on_missing='warn'`). Cells 8–11.
- **Key params:** 14 EEG channels (AF3, F7, F3, FC5, T7, P7, O1, O2, P8, T8, FC6, F4, F8, AF4); sfreq 256.1 Hz; highpass 0, lowpass 128.1 Hz (info dump, cell 10).
- **Result:** Raw + sensor plot produced; `raw.info` confirms 14 EEG chans, 17 dig points.
- **Verdict:** Works.

### S4 · Event array + band-pass filter + epoching (single recording)
- **Goal:** Map log timestamps to sample indices, filter, and epoch.
- **Method:** `np.searchsorted` over index; blue→covert(1), red→overt(2), black→fixation(3); `raw.filter(1,64,'firwin')`; convert to volts (`*1e-6`); `reject=dict(eeg=200e-6)`; `mne.Epochs(tmin/tmax default -0.199…0.5 s, baseline -0.199…0)`. Cell 12.
- **Key params:** band 1–64 Hz; FIR len 847 samples (3.307 s); reject 200 µV.
- **Result:** "Created 800 events: covert_speech 130, overt_speech 130, fixation 540." 589 matching events kept after dedup; epochs object (cell 16) = 589 events.
- **Verdict:** Works.

### S5 · ICA fit + component inspection (single recording)
- **Goal:** Decompose into ICs to identify artifacts.
- **Method:** `ICA(n_components=14, method='picard', random_state=15)`; `plot_components`/`plot_sources`. Cells 13–15.
- **Key params:** 14 components, picard.
- **Result:** "Fitting ICA took 15.2s," 42 iterations, 173232 samples, 14 components, no sources marked for exclusion (initial fit).
- **Verdict:** Works; basis for manual exclude-list selection.

### S6 · ERP/evoked diagnostics + epoch QA (single recording)
- **Goal:** Sanity-check epochs before/after cleaning.
- **Method:** `epochs.plot()` (24 bad epochs dropped, mostly AF4); `plot_compare_evokeds` for covert vs overt vs fixation averages using GFP. Cells 16–18.
- **Result:** Cell 17 drops 24 bad epochs (frontal channels AF3/AF4 dominate rejections). GFP evoked comparison plotted.
- **Verdict:** Diagnostic only; no quantitative result.

### S7 · ICA apply + re-fit (single recording)
- **Goal:** Remove artifact ICs and verify cleaning.
- **Method:** `ica.apply(raw, exclude=[0,1,4,7])`; re-plot; re-fit a second ICA (`ica2`) and re-epoch (`epochs_cleaned`). Cells 19–23.
- **Key params:** excluded ICs 0,1,4,7 (zeroed 4 components, projected back via 14 PCA components).
- **Result:** Cleaned RawArray 14×173232 (676.3 s). `ica2` re-fit took 24.6s but emitted a stability warning: variance ratio largest/smallest = 8.6 / 1.2e-31 (>1e6) — "may lead to an unstable mixing matrix; consider n_components=0.999999 or ≤10." Cleaned evoked comparison re-plotted.
- **Verdict:** Works but the post-apply re-ICA is numerically ill-conditioned (rank-deficient after first ICA removal) — flagged by MNE.

### S8 · Misc QA plots (PSD, raw-with-events, FE, channel means)
- **Goal:** Visual data-quality checks.
- **Method:** `raw.compute_psd().plot()` (cell 24); raw plot with event overlays (cell 25); `FE.UpperFaceAction` value_counts (cells 28–29); large multi-channel time plot (cell 30); per-channel mean±SEM bar chart (cell 32). `events` unique = `[1 2 3]` (cell 27).
- **Result:** Plots/value-counts only; no model metrics.
- **Verdict:** Exploratory; confirms event coding and channel scales.

### S9 · Word/direction ERP extraction (raw amplitude)
- **Goal:** Average raw-amplitude epochs per direction (up/down/left/right) for covert/overt.
- **Method:** `extract_word_events` parses `display to '<word>'` cues and the preceding fixation cross; `extract_epochs` windows tmin=-0.2…tmax=0.8 s. Cell 33.
- **Result:** Prints epoch start/end indices (5 events per direction-covert, ~5 overt). Plots only.
- **Verdict:** Diagnostic; small N (≈5/condition).

### S10 · POW.* band-power overlays (Theta/Alpha/Beta/Gamma)
- **Goal:** Compare Emotiv-provided band-power per direction × covert/overt.
- **Method:** Select `POW.*` columns by band suffix; epoch with NaN-aware padding; mean±SEM overlays. Cells 34–35.
- **Result:** Cell 34 runs (empty-legend warnings). Cell 35 prints per-direction event counts and covert/overt means then errors: `TypeError: unsupported operand … 'NoneType' and 'int'` (a direction returned `None` epochs). Diagnostic only.
- **Verdict:** Partially broken (cell 35 crashes mid-loop); no usable summary metric.

### S11 · Filtered band ERP overlays (Delta…Gamma)
- **Goal:** Same as S9 but on band-pass-filtered raw signal across 5 bands.
- **Method:** `extract_rhythm_epochs` copies raw and filters per band (Delta 0.5–4, Theta 4–8, Alpha 8–12, Beta 12–30, Gamma 30–100). Cell 36.
- **Result:** Filter logs printed (e.g. Delta FIR len 1691 samples). Plots only.
- **Verdict:** Diagnostic.

### S12 · Batch preprocessing of 22 recordings → ICA → PCA → pickle (CANONICAL)
- **Goal:** Produce the cleaned per-recording dataset.
- **Method:** Loop over `files_256` (22 recordings). Per recording: `alt_pipeline`→`eeg_only`→RawArray→DC-offset removal (subtract per-channel mean)→montage→build events from its log→`filter(1,64)`→volts→epoch (reject 200 µV)→`ICA(14, picard, rs=15)`→`ica.apply(exclude=exclude[i])`→`PCA(n_components=14)` on cleaned data→re-epoch (`epochs_cleaned`). Cells 37–41.
- **Key params:** per-recording hand-curated `exclude` lists (cell 40), e.g. `[0]`, `[0,1,4,12]`, `[7,9,11]`, … one entry per recording (one is `[]`); PCA full 14 components.
- **Result:** Loop prints "Fitted ICA for <file>" per recording; pickled to `processed_data_pca.pkl` (cell 41). NOTE: cell 40's *saved* output shows `NameError: name 'eeg_only' is not defined` — a stale run-order artifact (S3's defs not in scope at that execution). Cell 44 confirms a reloaded recording's epochs = 582 events (covert 130 / overt 130 / fixation 322).
- **Verdict:** Canonical artifact-producing step. Works when run in order; the saved error is a re-run/ordering artifact, not a logic bug.

### S13 · Gamma covert-direction epoch extraction → npz (CANONICAL)
- **Goal:** Build the gamma-band covert-direction dataset for classification.
- **Method:** `extract_gamma` filters each recording's `raw` to **30–64 Hz**, windows tmin=-0.4…tmax=0.8 s around covert cues only, labels up=0/down=1/left=2/right=3; downsample `[::2]` when >200 timepoints; concatenate across all 22 recordings. Cells 46–51.
- **Key params:** gamma 30–64 Hz (FIR len 113 samples / 0.441 s); covert only; final per-epoch shape `(14, 154)`.
- **Result:** Per-recording shapes printed (e.g. `(11,14,154)`). Saved to `gamma_epochs_no_pca.npz` (cell 51). Cells 47–50 are spot checks (e.g. recording 15 event counts: right 10/10, left 5/5, up 5/5, down 5/5; sfreq 128.07; one extraction `(11,14,154)`).
- **Verdict:** Canonical artifact-producing step.

### S14 · Class balancing + CNN sanity-check classifier (gamma, 4-way direction)
- **Goal:** Sanity-check whether covert direction is decodable from gamma epochs.
- **Method:** Load `gamma_epochs_pca.npz` (cell 54 — externally produced); drop every other `right` (class 3) sample to balance (cells 55–57); train/test split 80/20 stratified, StandardScaler; PyTorch depthwise/grouped 1D-CNN (`conv1` 14→28 g=14 k16, `conv2` 28→56 g=28 k32, `conv3` 56→128 k32, AvgPool, dropout 0.3, mean-pool, Linear→4). LSTM branch commented out. Adam lr=1e-3 wd=1e-4, StepLR(50,0.5), CrossEntropy, batch 16, 100 epochs, CPU. Cells 52–63.
- **Key params:** 232,344 params; input 14×154; 4 classes.
- **Result:** Pre-balance class counts (cell 53): class3=211, classes 0/1/2=105 each. After balancing (cell 57): `X (421,14,154)`. Split: train 336, test 85 (cell 61). Training **overfits hard** — train acc climbs 21%→**87.2%** while test acc stays at chance and *falls* (epoch 0: 25.9%; epoch 99: 18.8%; test loss rises 1.38→3.29). **Final test accuracy 18.82%** (below 25% chance for 4 classes). Per-class: UP 28.6%, DOWN 9.5%, LEFT 19.0%, RIGHT 18.2%. Confusion matrix near-uniform.
- **Verdict:** Negative result — no generalizable covert-direction signal in gamma with this setup; pure overfitting. Note the cell-63 summary text says "Gamma 30–100 Hz / CNN+LSTM," but the actual filter was 30–64 Hz and the LSTM is disabled (stale labels in the print).

## Caveats / notes
- **All-code notebook**, heavily run-order-dependent. Several saved outputs are stale errors (`NameError` for `log` in S1, `eeg_only` in S12) that occur only because of out-of-order execution, not real defects.
- **Mixed sampling rates** (128 vs 256 Hz). `extract_gamma` downsamples 256 Hz recordings via `[::2]` to align to 154 timepoints, but the batch RawArray in S12 builds `info` using the *global* `sfreq` variable (leaked from earlier cells) rather than each recording's own `sf` — a latent correctness risk in `processed_data_pca.pkl`'s `raw.info['sfreq']`.
- **ICA exclude-lists are manual** (eyeballed per recording in cell 40); not reproducible from an automated criterion.
- **Post-apply re-ICA (S7) is rank-deficient** — MNE warns the mixing matrix is unstable (variance ratio ~7e31).
- The classifier (S14) loads `gamma_epochs_pca.npz`, **not** the `gamma_epochs_no_pca.npz` this notebook saves — so the sanity-check ran on a different (PCA) variant than the no-PCA artifact produced here.
- Gamma window in S13 uses tmin=-0.4 (vs -0.2 elsewhere); covert-only labeling.
- Class imbalance toward `right`/fixation throughout; S14's crude every-other-`right` drop only partially fixes it.

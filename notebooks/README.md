# Notebooks

Every experiment notebook, renamed to reflect what it actually contains. **Each notebook holds
multiple experiments** — the full, per-experiment breakdown with extracted results lives in
[`../reports/experiments/`](../reports/experiments/), and the cross-notebook summary is
[`../docs/EXPERIMENT_LOG.md`](../docs/EXPERIMENT_LOG.md). Start there.

Notebooks are kept as **frozen artifacts** (with their saved outputs). They reference the old flat
file layout (`data/…`, `data_logs/…`, `*.npz` in the repo root); the canonical, path-corrected
pipeline is `preprocessing/produce_dataset.py`. Treat the notebooks as a record of what was tried,
not as runnable scripts.

| Notebook | What's inside | Detailed log |
|---|---|---|
| `01_preprocessing-signal-quality-qa.ipynb` | Per-recording cleaning + PSD/band-power/alpha-ERD QA; exports interactive HTML | [01](../reports/experiments/01_preprocessing-signal-quality-qa.md) |
| `02_data-quality-audit-column-selection.ipynb` | Which recordings/columns to keep; stream-usefulness audit | [02](../reports/experiments/02_data-quality-audit-column-selection.md) |
| `03_preprocessing-ica-pca-pipeline.ipynb` | **Canonical preprocessing** (ICA+PCA) → `processed_data_pca.pkl`; gamma CNN sanity check | [03](../reports/experiments/03_preprocessing-ica-pca-pipeline.md) |
| `04_event-log-timestamp-alignment.ipynb` | Helper: align log timestamps to EEG index (stub) | [04](../reports/experiments/04_event-log-timestamp-alignment.md) |
| `05_covert-speech-direction-cnn.ipynb` | Main workbench: GFP, band sweep, CNN-LSTM, paper features, **DEAP genetic-algorithm** selection, autoencoder | [05](../reports/experiments/05_covert-speech-direction-cnn.md) |
| `06_covert-overt-spectrogram-classifiers.ipynb` | Morlet spectrograms → LSTM / XGBoost / LogReg / SVM / 2D-CNN | [06](../reports/experiments/06_covert-overt-spectrogram-classifiers.md) |
| `07_cnn-lstm-gamma-direction-classifier.ipynb` | CNN-LSTM on gamma covert epochs | [07](../reports/experiments/07_cnn-lstm-gamma-direction-classifier.md) |
| `08_one-vs-all-covert-up-detection.ipynb` | Binary "up" vs rest (LogReg/CatBoost/CNN/MLP) | [08](../reports/experiments/08_one-vs-all-covert-up-detection.md) |
| `09_covert-to-overt-seq2seq-translation.ipynb` | LSTM seq2seq translating covert → overt EEG | [09](../reports/experiments/09_covert-to-overt-seq2seq-translation.md) |
| `10_emotiv-cortex-recording-scratch.ipynb` | Acquisition scratch (Cortex API recording) | [10](../reports/experiments/10_emotiv-cortex-recording-scratch.md) |

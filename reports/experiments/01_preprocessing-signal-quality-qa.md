# 01 · Preprocessing & signal-quality QA — `01_preprocessing-signal-quality-qa.ipynb`

> Per-recording preprocessing + signal-quality inspection (single subject, "Aws Safi", 3 runs). Not
> a classifier — it cleans each recording, aligns it with the event log, and emits diagnostics plus
> interactive HTML plots used for QA.

**Data inputs:** raw `data/raw/Aws Safi*.csv` + `data/logs/Aws Safi/*.txt` (3 runs).
**Artifacts produced:** interactive Plotly/MNE HTML per recording (now in `reports/eeg-html/`).

## Experiments / analyses

### E1 · Cleaning pipeline
- **Method:** `mne.io.RawArray` + `standard_1020` montage; band-pass **0.5–64 Hz**; notch **50/60 Hz**;
  ICA (Picard, up to 15 components) with automatic EOG/eye-artifact detection.
- **Result:** cleaned Raw per recording; "Successfully parsed 3 log files".

### E2 · PSD / band-power report
- **Method:** Welch PSD per band (delta/theta/alpha/beta/gamma); relative band-power %; dominant-band
  detection.
- **Result/finding:** textual per-recording band-power summary + dominant band (values in cell output;
  no single headline number).

### E3 · Channel-quality stats
- **Method:** summarise `CQ.*` quality columns into a signal-quality %.
- **Finding:** per-recording quality % reported (motivates the drop decisions formalised in notebook 02).

### E4 · Alpha ERD/ERS heuristic
- **Method:** FFT-based alpha power comparing fixation vs word-presentation windows; flags
  event-related desynchronisation if ERD > 15% ("strong alpha suppression → attentive processing").
- **Finding:** heuristic attention indicator per recording (qualitative).

### E5 · Interactive QA export
- **Result:** writes one interactive HTML per recording (cleaned multi-channel EEG with event-marker
  lines) — the files under `reports/eeg-html/`.

## Caveats / notes
- Single-subject QA tool; intended to be run per recording, not a batch dataset builder.
- Uses 0.5–64 Hz + notch, slightly different from the canonical pipeline (03) which uses 1–64 Hz, no notch.

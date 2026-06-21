# 02 · Data-quality audit & column selection — `02_data-quality-audit-column-selection.ipynb`

> The audit that justifies which recordings and which columns are kept for analysis. Loads a
> recording + its log, inspects every data stream (EEG quality, POW band-power, FE/MC/PM metrics,
> motion), and arrives at the explicit column drop-list used everywhere downstream.

**Data inputs:** one recording CSV (`Kinda Mashal …md.pm.bp.mc.fe.csv`) + its log; KDE/line/hist
across all `data/raw/` CSVs.
**Artifacts produced:** none (analysis only) — but its conclusions are baked into `alt_pipeline()`
in `preprocessing/produce_dataset.py` and notebooks 03/05/06.

## Experiments / analyses

### E1 · EEG signal-quality (`EEG.RawCq`, `EQ.OVERALL`) distribution
- **Finding:** ~**0.375 of every real recording** has zero `EEG.RawCq` (a consistent hardware ceiling);
  genuine recordings cluster near full quality while non-experiment/test recordings sit near 0.99 —
  useful for separating real vs junk sessions.

### E2 · Stream redundancy / usefulness
- **Findings:**
  - `EEG.Interpolated` is **all zeros** → useless.
  - `MOT.CounterMems` is **redundant with `EEG.Counter`**.
  - Motion (`MOT.*`) captures **head movement, not neural/speech** activity.
  - `PM.*.IsActive` flags are true for only ~**67 of 86,500** rows and identical across metrics → useless.
  - `FE.*` / `MC.*` streams are ~**87%+ null** (FE nulls uniformly spaced) → not usable as features.

### E3 · Event/timestamp alignment check
- **Method:** convert log timestamps (Asia/Amman / Europe/Zurich) and overlay event markers on EEG.
- **Finding:** confirms the blue=covert / red(or lightblue)=overt / black-cross=fixation marker scheme
  used by all downstream epoching.

## Conclusions (the drop-list rationale)
Keep only `EEG.<channel>` (the 14 electrodes). **Drop:** `EEG.Interpolated`, `OriginalTimestamp`,
`EEG.MarkerHardware`, battery columns, all `MOT.*`, all `CQ.*`, all `EQ.*`, `PM.*.IsActive`, `MC.*`,
and the `MarkerType/Index/ValueInt` columns. This is exactly the drop-list implemented in
`alt_pipeline()`.

## Caveats / notes
- This notebook is the "why" behind the preprocessing; pair it with notebook 03 (the "how").

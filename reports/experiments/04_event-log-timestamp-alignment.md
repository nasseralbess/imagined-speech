# 04 · Event-log timestamp alignment — `04_event-log-timestamp-alignment.ipynb`

> A small helper / scratch notebook (originally `classifier_post_process.ipynb`, a misnomer). It
> parses a run's text event log into `(timestamp, colour, label)` tuples and defines a
> `searchsorted`-based routine to snap event windows onto an EEG DataFrame's datetime index. No
> model, no metric — pure plumbing that was later folded into the real pipelines.

**Data inputs:** one log file (`data/logs/Kinda Mashal/Kinda Mashal_run*.txt`).
**Artifacts produced:** none.

## Experiments / steps

### E1 · Log parsing
- **Method:** `add_three_hours()` timezone fix-up + `mp()` colour mapping; filter lines to
  word-display and fixation markers.
- **Result:** list of `(timestamp, colour, description)` tuples.

### E2 · Timestamp → index matching
- **Method:** `match_timestamps_to_df_index()` uses `np.searchsorted` over a datetime index to map
  each event window onto the nearest existing rows, clamping out-of-range positions.
- **Result:** matched `(start, end)` index pairs. (Note: `pd` is used without an explicit import.)

## Caveats / notes
- Near-stub: 5 cells, no analysis output. Kept for provenance; the same logic lives in
  `produce_dataset.py` (`extract_word_events`) and notebooks 03/05.

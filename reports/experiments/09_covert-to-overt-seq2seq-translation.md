# 09 · Covert→overt seq2seq translation — `09_covert-to-overt-seq2seq-translation.ipynb`

> Tests the core hypothesis behind the project's "encoder-decoder gimmick": can an LSTM
> sequence-to-sequence model **translate the covert (imagined) EEG signal into the overt (spoken)
> EEG signal**? Builds a paired covert/overt dataset from raw recordings and trains the seq2seq.
> The data pipeline works; the translation does not learn.

**Data inputs:** raw Emotiv CSVs (14 channels) + 5 parsed `data/logs/Rama Bashar/*.txt` event logs.
**Artifacts produced:** `best_model.pth` (best-val checkpoint).

## Experiments

### E1 · Paired covert/overt data pipeline
- **Method:** parse logs (blue=covert, red=overt), align timestamps with `np.searchsorted`, segment
  per-trial covert and overt windows; `CovertOvertDataset` with `StandardScaler`; variable-length
  padding via `collate_fn` + `pad_sequence`.
- **Result:** works — builds covert/overt pairs (~199 vs ~198 timepoints, 14 channels) from 5 logs.
- **Verdict:** solid.

### E2 · Visualisation helper
- **Result:** one call raised `AttributeError` (`vis_2` returns `None`); non-blocking scratch.
- **Verdict:** minor bug, ignore.

### E3 · LSTM Seq2Seq (covert → overt)
- **Method / model:** LSTM encoder + LSTM decoder (hidden 256, 2 layers) + linear head, autoregressive
  decoding to the target length; MSELoss, Adam, ReduceLROnPlateau, early stopping; saves `best_model.pth`.
- **Result:** **val MSE stuck at ~1.318** (best at epoch 1); train loss 1.09–1.26 with no downtrend;
  early-stopped at **epoch 6**. The zero-seeded autoregressive decoder collapses to the mean.
- **Verdict:** failed — the model does not learn the covert→overt mapping.

### E4 · Qualitative inspection
- **Method:** per-channel overt vs covert vs prediction time-series plots (14-channel and single-channel).
- **Result:** predictions are near-constant, consistent with E3's flat loss.
- **Verdict:** confirms failure.

## Caveats / notes
- This was meant to be the feasibility test for the whole covert/overt approach; the negative result
  is important — it argues the covert signal (as captured) doesn't carry enough to reconstruct overt.
- The pipeline and dataset code are reusable; only the model/training failed.

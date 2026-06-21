# Reports & artifacts

Generated outputs and the written record of the experiments.

- **`experiments/`** — one Markdown log per notebook, documenting every experiment it contains with
  results extracted from the notebook outputs. Indexed by [`../docs/EXPERIMENT_LOG.md`](../docs/EXPERIMENT_LOG.md).
- **`eeg-html/`** — interactive MNE/Plotly QA reports, one per recording, produced by
  `notebooks/01_preprocessing-signal-quality-qa.ipynb`.
- **`figures/`** — static figures (e.g. `psd.png`).
- **`catboost/`** — CatBoost training telemetry (`catboost_training.json`, `learn_error.tsv`,
  `time_left.tsv`, tensorboard events) from a classifier run.

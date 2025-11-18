# Imagined Speech EEG classification

This repository contains a collection of scripts and data for classifying imagined speech from EEG data. The project is built around the Emotiv EpocX headset and its Cortex API. It includes components for data acquisition, processing, and analysis.

## Key Components

### 1. Data Acquisition

- **`cortex.py`**: A Python wrapper for the Emotiv Cortex API. It handles the connection to the headset, session management, and data streaming.
- **`main.py`**: A FastAPI application that provides a simple API to control the recording process. It uses `cortex.py` to interact with the headset and saves the data to the `data` directory.
- **`index.html` and `cortex.js`**: A simple web interface for running the experiments and collecting data.

### 2. Data Processing

- **`produce_dataset.py`**: This is the main script for processing the raw EEG data. It uses the `mne` library to perform the following steps:
    - Filtering the data to specific frequency bands (e.g., gamma, beta, etc.).
    - Epoching the data around the speech events.
    - Applying PCA for dimensionality reduction.
    - Saving the processed data as `.npz` files.

### 3. Data Analysis and Modeling

- **Jupyter Notebooks**: The repository contains several Jupyter notebooks for exploratory data analysis, visualization, and building machine learning models. Some of the key notebooks are:
    - `analyze.ipynb`: For analyzing the processed data.
    - `simple_classifier.ipynb`: For building a simple classifier for the imagined speech task.
    - `denoise.ipynb`: For experimenting with different denoising techniques.

### 4. Data

- **`data` directory**: This directory contains the raw EEG data collected from the experiments.
- **`.npz` files**: These files contain the processed data, ready to be used for training machine learning models.

## How to run

While this repo is not set up to be run by a user, here are some of the files that can be run:
- `main.py`: This will start the FastAPI server for data acquisition.
- `produce_dataset.py`: This will process the raw data and create the datasets.
- The Jupyter notebooks can be run to analyze the data and train models.
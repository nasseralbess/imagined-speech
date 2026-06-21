import numpy as np
import pandas as pd
import mne
import os
from datetime import datetime
from mne.channels import make_standard_montage
from sklearn.decomposition import PCA
import pickle
import matplotlib.pyplot as plt
import re
from collections import defaultdict
import argparse
from pathlib import Path

# Resolve all data paths relative to the repository root so the script can be
# run from anywhere (it lives in preprocessing/, data lives in ../data/).
REPO_ROOT = Path(__file__).resolve().parent.parent
LOGS_DIR = REPO_ROOT / "data" / "logs"
PROCESSED_DIR = REPO_ROOT / "data" / "processed"

def add_three_hours(timestamp):
    k = timestamp.split('T')
    k[1]= str(int(k[1][:2])+3)+k[1][2:]
    return 'T'.join(k)

def mp(c):
    """Convert log color markers to valid Plotly colors"""
    if c.strip()=="'blue'":
        return 'blue'
    if c.strip()=="'lightblue'":
        return 'red'
    return 'black'

def eeg_only(df):
    eeg_cols = [col for col in df.columns if (col.startswith('EEG.')) and col not in ['EEG.Counter', 'EEG.RawCq']]
    return df[eeg_cols]

def alt_pipeline(file_path):
    df = pd.read_csv(file_path)
    df.drop(columns=["EEG.Interpolated", "OriginalTimestamp", "EEG.MarkerHardware", "EEG.BatteryPercent", "MOT.CounterMems", "MOT.InterpolatedMems", 'MOT.Q0', 'MOT.Q1', 'MOT.Q2', 'MOT.Q3', 'MOT.AccX', 'MOT.AccY',
        'MOT.AccZ', 'MOT.MagX', 'MOT.MagY', 'MOT.MagZ', "EEG.Battery", "EQ.SampleRateQuality", "PM.Engagement.IsActive", "PM.Excitement.IsActive", "PM.Stress.IsActive", "PM.Relaxation.IsActive", "PM.Interest.IsActive",'MC.Action', 'MC.ActionPower', 'MC.IsActive', 'CQ.AF3', 'CQ.F7', 'CQ.F3', 'CQ.FC5', 'CQ.T7', 'CQ.P7', 'CQ.O1',
        'CQ.O2', 'CQ.P8', 'CQ.T8', 'CQ.FC6', 'CQ.F4', 'CQ.F8', 'CQ.AF4',
        'CQ.Overall', 'EQ.OVERALL', 'EQ.AF3', 'EQ.F7', 'EQ.F3', 'EQ.FC5', 'EQ.T7', 'EQ.P7',
        'EQ.O1', 'EQ.O2', 'EQ.P8', 'EQ.T8', 'EQ.FC6', 'EQ.F4', 'EQ.F8', 'MarkerType', 'MarkerIndex', 'MarkerValueInt',
        'EQ.AF4'], inplace=True, errors='ignore')
    
    try:
        timestamps = pd.to_numeric(df['Timestamp'], errors='coerce')
        timestamps = timestamps[~np.isnan(timestamps)]
        if len(timestamps) > 1:
                sfreq = 1.0 / np.median(np.diff(timestamps))
                if not (10 < sfreq < 1000):
                    # print(f"Warning: Calculated sfreq ({sfreq:.2f} Hz) seems unusual. Falling back to 128 Hz.")
                    sfreq = 128.0
        else:
                # print("Warning: Not enough valid 'Timestamp' values to calculate sfreq. Falling back to 128 Hz.")
                sfreq = 128.0
    except Exception as e:
        # print(f"Warning: Error processing 'Timestamp' column: {e}. Falling back to 128 Hz.")
        sfreq = 128.0
    df.index = df['Timestamp']
    start_timestamp = df['Timestamp'].iloc[0]
    df.drop("Timestamp", axis=1,inplace=True)
    return df, sfreq, start_timestamp

event_id = {
    'covert_speech': 1,
    'overt_speech': 2,
    'fixation': 3,
}


files_256 = [
    "Mariam Alzoubi1748421044458_EPOCX_211983_2025.05.28T11.30.46+03.00.md.pm.bp.mc.fe.csv",
    "Kinda Mashal1748955877058_EPOCX_211983_2025.06.03T16.04.38+03.00.md.pm.bp.mc.fe.csv",
    "Rama Bashar1748353496467_EPOCX_211983_2025.05.27T16.44.57+03.00.md.pm.bp.mc.fe.csv",
    "Malak Tamimi1748951740528_EPOCX_211983_2025.06.03T14.55.41+03.00.md.pm.bp.mc.fe.csv",
    "Mohammad Shahwan1748424849832_EPOCX_211983_2025.05.28T12.34.11+03.00.md.pm.bp.mc.fe.csv",
    "Rama Bashar1748352682130_EPOCX_211983_2025.05.27T16.31.24+03.00.md.pm.bp.mc.fe.csv",
    "mohammad jaradat1750242921892_EPOCX_211983_2025.06.18T13.35.24+03.00.md.pm.bp.mc.fe.csv",
    "Kinda Mashal1748954273361_EPOCX_211983_2025.06.03T15.37.54+03.00.md.pm.bp.mc.fe.csv",
    "Mohammad Shahwan1748426328305_EPOCX_211983_2025.05.28T12.58.49+03.00.md.pm.bp.mc.fe.csv",
    "Kinda Mashal1748955054298_EPOCX_211983_2025.06.03T15.50.55+03.00.md.pm.bp.mc.fe.csv",
    "Mohammad Shahwan1748424068255_EPOCX_211983_2025.05.28T12.21.10+03.00.md.pm.bp.mc.fe.csv",
    "mohammad jaradat1750242146773_EPOCX_211983_2025.06.18T13.22.28+03.00.md.pm.bp.mc.fe.csv",
    "Mariam Alzoubi1748421900422_EPOCX_211983_2025.05.28T11.45.02+03.00.md.pm.bp.mc.fe.csv",
    "Malak Tamimi1748952464968_EPOCX_211983_2025.06.03T15.07.46+03.00.md.pm.bp.mc.fe.csv",
    "Malak Tamimi1748950961776_EPOCX_211983_2025.06.03T14.42.43+03.00.md.pm.bp.mc.fe.csv",
    "Aws Safi1742290353356_EPOCX_211983_2025.03.18T12.32.34+03.00.md.pm.bp.csv",
    "Khaled Abu Qteish1742217278209_EPOCX_211983_2025.03.17T16.14.39+03.00.md.pm.bp.csv",
    "Mohammad Tarshihi1742897131405_EPOCX_211983_2025.03.25T13.05.32+03.00.md.pm.bp.csv",
    "Aws Safi1742289648917_EPOCX_211983_2025.03.18T12.20.50+03.00.md.pm.bp.csv",
    "Aws Safi1742291163364_EPOCX_211983_2025.03.18T12.46.04+03.00.md.pm.bp.csv",
    "Mohammad Tarshihi1742896030991_EPOCX_211983_2025.03.25T12.47.12+03.00.md.pm.bp.csv",
    "Mohammad Tarshihi1742898052037_EPOCX_211983_2025.03.25T13.20.53+03.00.md.pm.bp.csv",
    

]

with open(PROCESSED_DIR / "processed_data_pca.pkl", "rb") as f:
    processed_l = pickle.load(f)

logs_l = []
for l in files_256:
    log_file = os.path.join(LOGS_DIR, l.split("1")[0], l.split("1")[0]+"_run"+l[l.find("1"):l.find("_EPOCX")]+".txt")
    logs_l.append(log_file)
    
logs = {}
for log_file in logs_l:
    if not log_file.endswith('.txt'):
        continue
    identifier = log_file.split("_run")[1].split(".")[0]
    try:
        with open(f"{log_file}", "r") as f:
            a = f.readlines()
            if not a:
                # print(f"WARNING: Empty log file: {log_file}")
                continue
            logs[identifier] = [
                (datetime.strptime(add_three_hours(line.split(" ")[0]), "[%Y-%m-%dT%H:%M:%S.%fZ]").timestamp(),
                mp(line.split(" ")[-1]),
                " ".join(line.split(" ")[2:]))
                for line in a
                if 'blue' in line or '+' in line
            ]
    except Exception as e:
        print(f"ERROR parsing log file {log_file}: {str(e)}")
        
        
def extract_word_events(logs, identifier, words=('up', 'down', 'left', 'right')):
    word_events = defaultdict(lambda: {'covert': [], 'overt': [], 'fixation': []})
    logs_list = logs[identifier]
    i = 0
    while i < len(logs_list):
        timestamp, color, desc = logs_list[i]
        match = re.search(r"display to '(\w+)'", desc)
        if match:
            word = match.group(1).lower()
            if word in words:
                if color == 'red':
                    word_events[word]['overt'].append(timestamp)
                elif color == 'blue':
                    word_events[word]['covert'].append(timestamp)
        elif 'cross' in desc and color == 'black':
            j = i + 1
            while j < len(logs_list):
                next_timestamp, next_color, next_desc = logs_list[j]
                next_match = re.search(r"display to '(\w+)'", next_desc)
                if next_match:
                    next_word = next_match.group(1).lower()
                    if next_word in words:
                        word_events[next_word]['fixation'].append(timestamp)
                        break
                j += 1
        i += 1
    return word_events

def extract_gamma(raw, word_events, start_timestamp, tmin=-0.4, tmax=0.8, sfreq=128, second_band=None, gamma=True, covert='covert', all_labels=False):
    if all_labels:
        label_map = {'son': 0, 'pear': 1, 'sun': 2, 'sea': 3, 'flower': 4, 'pair': 5, 'see': 6, 'night': 7,
                'right': 8, 'knight': 9, 'write': 10, 'flour': 11,
                'down': 12, 'smart': 13, 'big': 14,
                'left': 15, 'couple': 16, 'quick': 17,
                'up': 18, 'clever': 19}
        word_list = ["son", "pear", "sun", "sea", "flower", "pair", "see", "night",
                        "right", "knight", "write", "flour",
                        "down", "smart", "big",
                        "left", "couple", "quick",
                        "up", "clever"]
    else:
        label_map = {'up': 0, 'down': 1, 'left': 2, 'right': 3}
        word_list = ["up", "down", "left", "right"]
    bands = {
        'delta': (0.5, 4),
        'theta': (4, 8),
        'alpha': (8, 12),
        'beta': (12, 30),
        'gamma': (30, 64)
    }
    if gamma:
        filtered_raw = raw.copy().filter(bands['gamma'][0], bands['gamma'][1], fir_design='firwin')
    else:
        filtered_raw = raw.copy()
    if second_band:
        filtered_raw_second = raw.copy().filter(bands[second_band][0], bands[second_band][1], fir_design='firwin')
    X = []
    y = []
    for word in word_list:
        for event_type in [covert]:
            event_times = word_events[word][event_type]
            for t in event_times:
                idx = np.searchsorted(filtered_raw.times, t-start_timestamp)
                start = int(idx + tmin * sfreq)
                end = int(idx + tmax * sfreq)
                
                if start >= 0 and end < filtered_raw._data.shape[1]:
                    epoch_data = filtered_raw._data[:, start:end]
                    if second_band:
                        epoch_data_theta = filtered_raw_second._data[:, start:end]
                        epoch_data = np.vstack((epoch_data, epoch_data_theta))
                    X.append(epoch_data)
                    y.append(label_map[word])
                else:
                    print(f"Skipping epoch for {word} at {t} (out of bounds)")
    
    return np.array(X), np.array(y)


def main(pca, type, covert, all_labels):
    all_labels_str = 'all_labels' if all_labels else ''
    
    if all_labels:
        word_list = ["son", "pear", "sun", "sea", "flower", "pair", "see", "night",
                        "right", "knight", "write", "flour",
                        "down", "smart", "big",
                        "left", "couple", "quick",
                        "up", "clever"]
    else:
        word_list = ["up", "down", "left", "right"]

    if type == 'gamma':
        if pca:
            ch_names = [name.split('.')[1] for name in processed_l[0]["processed"].columns.tolist()]
            inf = mne.create_info(ch_names=ch_names, sfreq=processed_l[0]["sfreq"], ch_types=(['eeg']*len([i for i in processed_l[0]["processed"].columns if i.startswith('EEG.')]))+['bio']*len([i for i in processed_l[0]["processed"].columns if i.startswith('FE.')]))
            raw = mne.io.RawArray(processed_l[0]["pca"], inf, verbose=False)
            mont = make_standard_montage('standard_1020')
            raw.set_montage(mont, match_case=False, on_missing='warn')
        else:
            raw = processed_l[0]["raw"]
        if covert:
            X, y = extract_gamma(raw, extract_word_events(logs, identifier=files_256[0].split("_")[0][files_256[0].split("_")[0].find("1"):], words=word_list), start_timestamp=processed_l[0]["start_timestamp"], sfreq=processed_l[0]["sfreq"], all_labels=all_labels)
        else:
            X, y = extract_gamma(raw, extract_word_events(logs, identifier=files_256[0].split("_")[0][files_256[0].split("_")[0].find("1"):], words=word_list), start_timestamp=processed_l[0]["start_timestamp"], sfreq=processed_l[0]["sfreq"], covert='overt', all_labels=all_labels)
        if X.shape[2] > 200:
            X = X[:, :, ::2]
        for i, item in enumerate(processed_l[1:]):
            if pca:
                ch_names = [name.split('.')[1] for name in item["processed"].columns.tolist()]
                inf = mne.create_info(ch_names=ch_names, sfreq=item["sfreq"], ch_types=(['eeg']*len([i for i in item["processed"].columns if i.startswith('EEG.')]))+['bio']*len([i for i in item["processed"].columns if i.startswith('FE.')]))
                raw = mne.io.RawArray(item["pca"], inf, verbose=False)
                mont = make_standard_montage('standard_1020')
                raw.set_montage(mont, match_case=False, on_missing='warn')
            else:
                raw = item["raw"]
            word_events = extract_word_events(logs, identifier=files_256[i+1].split("_")[0][files_256[i+1].split("_")[0].find("1"):], words=word_list)
            sfreq = item["sfreq"]
            if covert:
                X_item, y_item = extract_gamma(raw, word_events, start_timestamp=item["start_timestamp"], sfreq=sfreq, covert='covert', all_labels=all_labels)
            else:
                X_item, y_item = extract_gamma(raw, word_events, start_timestamp=item["start_timestamp"], sfreq=sfreq, covert='overt', all_labels=all_labels)
            if X_item.shape[2] > 200:
                X_item = X_item[:, :, ::2]
            X = np.concatenate((X, X_item), axis=0)
            y = np.concatenate((y, y_item), axis=0)
    
    elif type == 'dual_band':
        for band in ['delta', 'theta', 'alpha', 'beta']:
            if pca:
                ch_names = [name.split('.')[1] for name in processed_l[0]["processed"].columns.tolist()]
                inf = mne.create_info(ch_names=ch_names, sfreq=processed_l[0]["sfreq"], ch_types=(['eeg']*len([i for i in processed_l[0]["processed"].columns if i.startswith('EEG.')]))+['bio']*len([i for i in processed_l[0]["processed"].columns if i.startswith('FE.')]))
                raw = mne.io.RawArray(processed_l[0]["pca"], inf, verbose=False)
                mont = make_standard_montage('standard_1020')
                raw.set_montage(mont, match_case=False, on_missing='warn')
            else:
                raw = processed_l[0]["raw"]
            if covert:
                X, y = extract_gamma(raw, extract_word_events(logs, identifier=files_256[0].split("_")[0][files_256[0].split("_")[0].find("1"):], words=word_list), start_timestamp=processed_l[0]["start_timestamp"], sfreq=processed_l[0]["sfreq"], second_band=band, all_labels=all_labels)
            else:
                X, y = extract_gamma(raw, extract_word_events(logs, identifier=files_256[0].split("_")[0][files_256[0].split("_")[0].find("1"):], words=word_list), start_timestamp=processed_l[0]["start_timestamp"], sfreq=processed_l[0]["sfreq"], second_band=band, covert='overt', all_labels=all_labels)
            if X.shape[2] > 200:
                X = X[:, :, ::2]
            for i, item in enumerate(processed_l[1:]):
                if pca:
                    ch_names = [name.split('.')[1] for name in item["processed"].columns.tolist()]
                    inf = mne.create_info(ch_names=ch_names, sfreq=item["sfreq"], ch_types=(['eeg']*len([i for i in item["processed"].columns if i.startswith('EEG.')]))+['bio']*len([i for i in item["processed"].columns if i.startswith('FE.')]))
                    raw = mne.io.RawArray(item["pca"], inf, verbose=False)
                    mont = make_standard_montage('standard_1020')
                    raw.set_montage(mont, match_case=False, on_missing='warn')
                else:
                    raw = item["raw"]

                word_events = extract_word_events(logs, identifier=files_256[i+1].split("_")[0][files_256[i+1].split("_")[0].find("1"):], words=word_list)
                sfreq = item["sfreq"]
                if covert:
                    X_item, y_item = extract_gamma(raw, word_events, start_timestamp=item["start_timestamp"], sfreq=sfreq, second_band=band, covert='covert', all_labels=all_labels)
                else:
                    X_item, y_item = extract_gamma(raw, word_events, start_timestamp=item["start_timestamp"], sfreq=sfreq, second_band=band, covert='overt', all_labels=all_labels)
                if X_item.shape[2] > 200:
                    X_item = X_item[:, :, ::2]
                X = np.concatenate((X, X_item), axis=0)
                y = np.concatenate((y, y_item), axis=0)
            np.savez_compressed(PROCESSED_DIR / f"gamma_{band}_{'covert' if covert else 'overt'}_{'pca' if pca else 'no_pca'}_{all_labels_str}.npz", X=X, y=y)

    elif type == 'unfiltered':
        if pca:
            ch_names = [name.split('.')[1] for name in processed_l[0]["processed"].columns.tolist()]
            inf = mne.create_info(ch_names=ch_names, sfreq=processed_l[0]["sfreq"], ch_types=(['eeg']*len([i for i in processed_l[0]["processed"].columns if i.startswith('EEG.')]))+['bio']*len([i for i in processed_l[0]["processed"].columns if i.startswith('FE.')]))
            raw = mne.io.RawArray(processed_l[0]["pca"], inf, verbose=False)
            mont = make_standard_montage('standard_1020')
            raw.set_montage(mont, match_case=False, on_missing='warn')
        else:
            raw = processed_l[0]["raw"]
        if covert:
            X, y = extract_gamma(raw, extract_word_events(logs, identifier=files_256[0].split("_")[0][files_256[0].split("_")[0].find("1"):], words=word_list), start_timestamp=processed_l[0]["start_timestamp"], sfreq=processed_l[0]["sfreq"], gamma=False, all_labels=all_labels)
        else:
            X, y = extract_gamma(raw, extract_word_events(logs, identifier=files_256[0].split("_")[0][files_256[0].split("_")[0].find("1"):], words=word_list), start_timestamp=processed_l[0]["start_timestamp"], sfreq=processed_l[0]["sfreq"], gamma=False, covert='overt', all_labels=all_labels)
        if X.shape[2] > 200:
            X = X[:, :, ::2]
        for i, item in enumerate(processed_l[1:]):
            if pca:
                ch_names = [name.split('.')[1] for name in item["processed"].columns.tolist()]
                inf = mne.create_info(ch_names=ch_names, sfreq=item["sfreq"], ch_types=(['eeg']*len([i for i in item["processed"].columns if i.startswith('EEG.')]))+['bio']*len([i for i in item["processed"].columns if i.startswith('FE.')]))
                raw = mne.io.RawArray(item["pca"], inf, verbose=False)
                mont = make_standard_montage('standard_1020')
                raw.set_montage(mont, match_case=False, on_missing='warn')
            else:
                raw = item["raw"]
            word_events = extract_word_events(logs, identifier=files_256[i+1].split("_")[0][files_256[i+1].split("_")[0].find("1"):], words=word_list)
            sfreq = item["sfreq"]
            if covert:
                X_item, y_item = extract_gamma(raw, word_events, start_timestamp=item["start_timestamp"], sfreq=sfreq, gamma=False, all_labels=all_labels)
            else:
                X_item, y_item = extract_gamma(raw, word_events, start_timestamp=item["start_timestamp"], sfreq=sfreq, gamma=False, covert='overt', all_labels=all_labels)
            if X_item.shape[2] > 200:
                X_item = X_item[:, :, ::2]
            X = np.concatenate((X, X_item), axis=0)
            y = np.concatenate((y, y_item), axis=0)
            
        
    else:
        raise ValueError("Invalid type specified. Choose from 'gamma', 'dual_band', or 'unfiltered'.")
    
    if type == 'gamma':
        np.savez_compressed(PROCESSED_DIR / f"gamma_{'covert' if covert else 'overt'}_{'pca' if pca else 'no_pca'}_{all_labels_str}.npz", X=X, y=y)
    elif type == 'dual_band':
        pass
    elif type == 'unfiltered':
        np.savez_compressed(PROCESSED_DIR / f"unfiltered_{'covert' if covert else 'overt'}_{'pca' if pca else 'no_pca'}_{all_labels_str}.npz", X=X, y=y)
        
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Produce EEG dataset with specified preprocessing.")
    parser.add_argument('--pca', action='store_true', help='Use PCA processed data, default is raw data')
    parser.add_argument('--type', type=str, choices=['gamma', 'dual_band', 'unfiltered'], required=True, help='Type of preprocessing to apply')
    parser.add_argument('--overt', action='store_true', help='Extract overt speech events (default is covert)')
    parser.add_argument('--all_labels', action='store_true', help='Use all labels for extraction (not just up, down, left, right)')

    args = parser.parse_args()

    main(pca=args.pca, type=args.type, covert=not args.overt, all_labels=args.all_labels)
    
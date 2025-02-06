from fastapi import FastAPI
from pydantic import BaseModel
import time
import threading
import os
from datetime import datetime
from cortex import Cortex
from fastapi.middleware.cors import CORSMiddleware
import json

record_store = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Record():
    def __init__(self, app_client_id, app_client_secret, subject_name, run_id, **kwargs):
        self.c = Cortex(app_client_id, app_client_secret, debug_mode=True, **kwargs)
        self.c.bind(create_session_done=self.on_create_session_done)
        self.c.bind(create_record_done=self.on_create_record_done)
        self.c.bind(stop_record_done=self.on_stop_record_done)
        self.c.bind(warn_record_post_processing_done=self.on_warn_record_post_processing_done)
        self.c.bind(export_record_done=self.on_export_record_done)
        self.c.bind(inform_error=self.on_inform_error)

        self.logs = []
        self.subject_name = subject_name  
        self.run_id = run_id 
        self.headset_event = threading.Event()  
        self.headset_error = None

    def log(self, message):
        """
        Append a message to the log list and print it with a timestamp including milliseconds.
        """
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        timestamped_message = f"[{timestamp}] {message}"
        self.logs.append(timestamped_message)
        print(timestamped_message)

    def save_logs(self):
        """
        Save all logs to a subject-specific log file.
        """
        folder_path = os.path.abspath(f'./data_logs/{self.subject_name}')
        os.makedirs(folder_path, exist_ok=True) 
        log_file_path = os.path.join(folder_path, f"{self.subject_name}_run{self.run_id}.txt")
        with open(log_file_path, 'a') as log_file:
            log_file.write('\n'.join(self.logs))
        self.log(f"Logs saved to {log_file_path}")
        return log_file_path


    def start(self, record_duration_s=20, headsetId=''):
        self.record_duration_s = record_duration_s
        if headsetId != '':
            self.c.set_wanted_headset(headsetId)
        self.log("Attempting to open connection to headset...")
        self.c.open()

    def create_record(self, record_title, **kwargs):
        self.log(f"Creating record: {record_title}")
        self.c.create_record(record_title, **kwargs)

    def stop_record(self):
        self.log("Stopping record...")
        self.c.stop_record()

    def export_record(self, folder, stream_types, format, record_ids, version, **kwargs):
        self.log(f"Exporting record to folder: {folder}")
        self.c.export_record(folder, stream_types, format, record_ids, version, **kwargs)

    def wait(self, record_duration_s):
        self.log("Recording started...")
        length = 0
        while length < record_duration_s:
            self.log(f"Recording at {length} seconds")
            time.sleep(1)
            length += 1
        self.log("Recording ended.")

    def on_create_session_done(self, *args, **kwargs):
        self.log("Session created successfully. Headset found!")
        self.headset_event.set()
        self.create_record(self.record_title, description=self.record_description)

    # def on_create_record_done(self, *args, **kwargs):
    #     data = kwargs.get('data')
    #     self.record_id = data['uuid']
    #     self.log(f"Record created with ID: {self.record_id}")
    #     self.wait(self.record_duration_s)
    #     self.stop_record()
    def on_create_record_done(self, *args, **kwargs):
        data = kwargs.get('data')
        self.record_id = data['uuid']
        self.log(f"Record created with ID: {self.record_id}")

    def on_stop_record_done(self, *args, **kwargs):
        self.log("Recording stopped.")
        self.log("Post-processing in progress...")

    def on_warn_record_post_processing_done(self, *args, **kwargs):
        record_id = kwargs.get('data')
        self.log(f"Post-processing completed for record ID: {record_id}")
        self.export_record(self.record_export_folder, self.record_export_data_types,
                           self.record_export_format, [record_id], self.record_export_version)

    def on_export_record_done(self, *args, **kwargs):
        self.log("Data export completed successfully.")
        self.save_logs()  # Access subject_name and run_id from instance attributes
        self.c.close()

    def on_inform_error(self, *args, **kwargs):
        error_data = kwargs.get('error_data')
        self.log(f"Error: {error_data}")
        self.headset_error = error_data
        self.headset_event.set()
        self.save_logs()

class LogRequest(BaseModel):
    subject_name: str
    run_id: int
    log_data: str

@app.post("/save_log")
async def save_log(request: LogRequest):
    try:
        print(f"Received log request: {request.dict()}")
        folder_path = os.path.abspath(f"./data_logs/{request.subject_name}")
        os.makedirs(folder_path, exist_ok=True)
        log_file_path = os.path.join(folder_path, f"{request.subject_name}_run{request.run_id}.txt")
        with open(log_file_path, "a") as log_file:
            log_file.write(request.log_data + "\n")
        return {"status": "Log saved successfully", "file_path": log_file_path}
    except Exception as e:
        print(f"Error saving log: {str(e)}")
        return {"error": f"Failed to save log: {str(e)}"}



class RecordRequest(BaseModel):
    duration: float
    subject_name: str
    run_id: int
    sequence: list[list[str]]
    cursor_delay: float
    word_delay: float

@app.post("/start_recording")
async def start_recording(request: RecordRequest):
    subject_name = request.subject_name
    run_id = request.run_id

    your_app_client_id = 'o18uSIBuLSQPLCoIu14LDLjyStftQJ4q78LuXXnk'
    your_app_client_secret = 'Jj3uxkbaLHsCiQJdhXIfg1DvSe6BCvaboaYFuGqKYZtlmfyVkXVRnCJU4tuQWrJMHxYePz5U802pBZll9Pn1ihH5Lcuz76rL6Q6hw3VWZxY0GUKX9UfS8GLQIJurRv9f'

    r = Record(
        your_app_client_id,
        your_app_client_secret,
        subject_name=subject_name,
        run_id=run_id
    )
    r.record_title = request.subject_name + str(request.run_id)
    r.record_description = ''
    r.record_export_folder = r'C:/Users/bess/Desktop/emotiv-wrapper/data'
    r.record_export_data_types = ['EEG', 'MOTION', 'PM', 'BP']
    r.record_export_format = 'CSV'
    r.record_export_version = 'V2'

    with open(f"data/{request.subject_name}_{request.run_id}_params.json", 'w') as f:
        json.dump({
            "cursor_delay": request.cursor_delay,
            "word_delay": request.word_delay,
            "sequence": request.sequence
        }, f)

    # Store the Record instance in the global dictionary
    record_store[run_id] = r

    def start():
        # Pass the dummy duration (it is ignored now)
        r.start(0)
    thread = threading.Thread(target=start)
    thread.start()
    timeout_seconds = 3
    if not r.headset_event.wait(timeout_seconds):
        r.log(f"Headset not found after waiting {timeout_seconds} seconds. Aborting recording.")
        r.c.close()
        return {"status": "error", "message": "Headset not found. Aborting recording."}
    if r.headset_error:
        return {"status": "error", "message": f"Error connecting to headset: {r.headset_error}"}
    return {"status": "Recording started"}


class StopRecordRequest(BaseModel):
    subject_name: str
    run_id: int

@app.post("/stop_recording")
async def stop_recording(request: StopRecordRequest):
    run_id = request.run_id
    r = record_store.get(run_id)
    if not r:
        return {"status": "error", "message": "Record instance not found."}
    r.stop_record()
    return {"status": "Record stopped successfully"}

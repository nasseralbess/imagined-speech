from fastapi import FastAPI
from pydantic import BaseModel
import time
import threading
import os
from datetime import datetime
from cortex import Cortex
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Record():
    def __init__(self, app_client_id, app_client_secret, **kwargs):
        self.c = Cortex(app_client_id, app_client_secret, debug_mode=True, **kwargs)
        self.c.bind(create_session_done=self.on_create_session_done)
        self.c.bind(create_record_done=self.on_create_record_done)
        self.c.bind(stop_record_done=self.on_stop_record_done)
        self.c.bind(warn_record_post_processing_done=self.on_warn_record_post_processing_done)
        self.c.bind(export_record_done=self.on_export_record_done)
        self.c.bind(inform_error=self.on_inform_error)

        # Initialize logging
        self.logs = []
        self.log_folder = os.path.abspath('./data_logs')
        os.makedirs(self.log_folder, exist_ok=True)

    def log(self, message):
        """
        Append a message to the log list and print it with a timestamp including milliseconds.
        """
        start_time = time.time()
        timestamped_message = f"[{start_time:.6f}] {message}"
        self.logs.append(timestamped_message)
        print(timestamped_message)


    def save_logs(self):
        """
        Save all logs to a timestamped log file in the log folder.
        """
        timestamp =  time.time()
        log_file_path = os.path.join(self.log_folder, f"log_{timestamp:.6f}.txt")
        with open(log_file_path, 'w') as log_file:
            log_file.write('\n'.join(self.logs))
        self.log(f"Logs saved to {log_file_path}")
        return log_file_path

    def start(self, record_duration_s=20, headsetId=''):
        self.record_duration_s = record_duration_s
        if headsetId != '':
            self.c.set_wanted_headset(headsetId)
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

    # Callback functions
    def on_create_session_done(self, *args, **kwargs):
        self.log("Session created successfully.")
        self.create_record(self.record_title, description=self.record_description)

    def on_create_record_done(self, *args, **kwargs):
        data = kwargs.get('data')
        self.record_id = data['uuid']
        self.log(f"Record created with ID: {self.record_id}")
        self.wait(self.record_duration_s)
        self.stop_record()

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
        self.save_logs()  # Save logs after exporting
        self.c.close()

    def on_inform_error(self, *args, **kwargs):
        error_data = kwargs.get('error_data')
        self.log(f"Error: {error_data}")
        self.save_logs()

class RecordRequest(BaseModel):
    duration: int

@app.post("/start_recording")
async def start_recording(request: RecordRequest):
    record_duration_s = request.duration

    # Initialize Record class in the same thread as the request
    your_app_client_id = 'o18uSIBuLSQPLCoIu14LDLjyStftQJ4q78LuXXnk'
    your_app_client_secret = 'Jj3uxkbaLHsCiQJdhXIfg1DvSe6BCvaboaYFuGqKYZtlmfyVkXVRnCJU4tuQWrJMHxYePz5U802pBZll9Pn1ihH5Lcuz76rL6Q6hw3VWZxY0GUKX9UfS8GLQIJurRv9f'

    r = Record(your_app_client_id, your_app_client_secret)
    r.record_title = 'bread1'
    r.record_description = ''
    r.record_export_folder = r'C:/Users/bess/Desktop/emotiv-wrapper/data'
    r.record_export_data_types = ['EEG', 'MOTION', 'PM', 'BP']
    r.record_export_format = 'CSV'
    r.record_export_version = 'V2'

    def start():
        r.start(record_duration_s)

    threading.Thread(target=start).start()
    return {"status": "Recording started"}

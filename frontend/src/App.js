// App.js
import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Dialog,
  DialogContent,
  CircularProgress,
  Alert,
  MenuItem
} from '@mui/material';
import { EXPERIMENTS, EXPERIMENT_IDS, DEFAULT_EXPERIMENT } from './experiments';

const DEFAULT_NUM_TRIALS = 5;

function App() {
  // Form state and UI state.
  const [cursorDuration, setCursorDuration] = useState(0.25); // seconds
  const [wordDuration, setWordDuration] = useState(1);        // seconds
  const [subjectName, setSubjectName] = useState('Test1');
  const [experimentId, setExperimentId] = useState(DEFAULT_EXPERIMENT);
  const [numTrials, setNumTrials] = useState(DEFAULT_NUM_TRIALS);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Full-screen display state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [textColor, setTextColor] = useState("black");

  const experiment = EXPERIMENTS[experimentId];

  // Helper delay function
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Log events to the backend (unchanged)
  const logEvent = async (message, subjectName, runID) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    try {
      const response = await fetch('http://127.0.0.1:8000/save_log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject_name: subjectName,
          run_id: runID,
          log_data: logEntry,
        }),
      });
      if (!response.ok) {
        console.error("Failed to save log:", await response.json());
      }
    } catch (error) {
      console.error("Error saving log:", error);
    }
  };

  // Update display on full-screen dialog (unchanged)
  const updateDisplay = (text, textColor, subjectName, runID) => {
    setDisplayText(text);
    setTextColor(textColor);
    logEvent(`Updated display to '${text}' with text color '${textColor}'`, subjectName, runID);
  };

  // Open and close full-screen dialog (unchanged)
  const openFullScreenDisplay = () => setDialogOpen(true);
  const closeFullScreenDisplay = (subjectName, runID) => {
    setDialogOpen(false);
    logEvent("Recording display closed", subjectName, runID);
  };

  // A precise delay function (unchanged)
  const preciseDelay = async (ms) => {
    const start = performance.now();
    await delay(ms);
    const end = performance.now();
    console.log(`Expected delay: ${ms}ms, Actual delay: ${end - start}ms`);
  };

  // Start recording on the backend (we still send a dummy duration value)
  const startRecording = async (subjectName, runID, trials) => {
    const commonEventTime = new Date().toISOString();
    await logEvent(`Common event: Recording initiated at ${commonEventTime}`, subjectName, runID);

    try {
      const response = await fetch('http://127.0.0.1:8000/start_recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Since we no longer want to stop automatically, the duration value is ignored.
          duration: 0,
          subject_name: subjectName,
          run_id: runID,
          // One inner list per trial, in the exact order the words will be shown.
          sequence: trials.map((trial) => trial.words),
          experiment: experimentId,
          num_trials: trials.length,
          cursor_delay: parseFloat(cursorDuration),
          word_delay: parseFloat(wordDuration),
          common_event_time: commonEventTime
        }),
      });
      const data = await response.json();
      console.log("Start Recording Response:", data);
      if (data.status === "error") {
        await logEvent(`Error starting recording: ${data.message}`, subjectName, runID);
        throw new Error(data.message);
      }
      await logEvent("Recording started successfully", subjectName, runID);
      return true;
    } catch (error) {
      await logEvent(`Failed to start recording: ${error.message}`, subjectName, runID);
      throw error;
    }
  };

  // Stop recording on the backend.
  const stopRecording = async (runID, subjectName) => {
    try {
      const response = await fetch('http://127.0.0.1:8000/stop_recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runID, subject_name: subjectName })
      });
      const data = await response.json();
      console.log("Stop Recording Response:", data);
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  };

  // Present one stimulus word: fixation -> word (lightblue = overt) ->
  // fixation -> word (blue = covert). preprocessing/produce_dataset.py reads the
  // colour out of the log to decide overt vs covert, so these two colours and
  // the log wording around them must not change.
  const presentWord = async (item, subjectName, runID) => {
    const { word, label, crossNotes } = item;

    updateDisplay("+", "black", subjectName, runID);
    await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds ${crossNotes.first}`, subjectName, runID);
    await preciseDelay(parseFloat(cursorDuration) * 1000);

    updateDisplay(word, "lightblue", subjectName, runID);
    await logEvent(`Displayed ${label} '${word}' for ${wordDuration} seconds`, subjectName, runID);
    await preciseDelay(parseFloat(wordDuration) * 1000);

    updateDisplay("+", "black", subjectName, runID);
    await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds ${crossNotes.repeat}`, subjectName, runID);
    await preciseDelay(parseFloat(cursorDuration) * 1000);

    updateDisplay(word, "blue", subjectName, runID);
    await logEvent(`Displayed ${label} '${word}' again for ${wordDuration} seconds`, subjectName, runID);
    await preciseDelay(parseFloat(wordDuration) * 1000);
  };

  // A bare fixation cross with no word after it (legacy block separator).
  const presentCross = async (item, subjectName, runID) => {
    updateDisplay("+", "black", subjectName, runID);
    await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds ${item.note}`, subjectName, runID);
    await preciseDelay(parseFloat(cursorDuration) * 1000);
  };

  // Run a test sequence of the selected experiment (no backend calls, one trial).
  const runTestSequence = async () => {
    setLoading(true);
    setStatusMessage(`Test run in progress (${experiment.label})...`);
    setDialogOpen(true);

    const [trial] = experiment.buildTrials({ numTrials: 1 });
    console.log("Test trial:", trial.words);

    for (const item of trial.items) {
      if (item.kind === 'cross') {
        setDisplayText("+"); setTextColor("black");
        await preciseDelay(parseFloat(cursorDuration) * 1000);
        continue;
      }

      setDisplayText("+"); setTextColor("black");
      await preciseDelay(parseFloat(cursorDuration) * 1000);

      setDisplayText(item.word); setTextColor("lightblue");
      await preciseDelay(parseFloat(wordDuration) * 1000);

      setDisplayText("+"); setTextColor("black");
      await preciseDelay(parseFloat(cursorDuration) * 1000);

      setDisplayText(item.word); setTextColor("blue");
      await preciseDelay(parseFloat(wordDuration) * 1000);
    }

    setDialogOpen(false);
    setStatusMessage("Test run completed.");
    setLoading(false);
  };

  // Main UI sequence: build the trials for the selected experiment, then walk them.
  const runRecordingSequence = async () => {
    // Use timestamp as unique run ID.
    const runID = Date.now();
    const trialCount = Math.max(1, parseInt(numTrials, 10) || DEFAULT_NUM_TRIALS);
    const trials = experiment.buildTrials({ numTrials: trialCount });
    console.log(`Experiment '${experimentId}' trials:`, trials.map((t) => t.words));

    setLoading(true);
    setStatusMessage("Starting recording...");

    await startRecording(subjectName, runID, trials);
    await logEvent(`Experiment: ${experimentId} (${trialCount} trials)`, subjectName, runID);
    await logEvent("Starting delay period", subjectName, runID);
    openFullScreenDisplay();

    try {
      for (let trial = 0; trial < trials.length; trial++) {
        const { words, items } = trials[trial];
        await logEvent(
          `Starting trial ${trial + 1}/${trials.length} [${experimentId}]: [${words.join(', ')}]`,
          subjectName,
          runID
        );

        for (const item of items) {
          if (item.preLog) {
            await logEvent(item.preLog, subjectName, runID);
          }
          if (item.kind === 'cross') {
            await presentCross(item, subjectName, runID);
          } else {
            await presentWord(item, subjectName, runID);
          }
        }
      }

      // Once UI sequence is done, close the display.
      closeFullScreenDisplay(subjectName, runID);
      setStatusMessage("UI sequence completed. Stopping recording shortly...");

      // Wait a slight delay (e.g., 1 second) after UI calls before stopping the recording.
      await preciseDelay(1000);

      // Call new endpoint to stop the recording.
      await stopRecording(runID, subjectName);
      setStatusMessage("Recording completed successfully!");
      setLoading(false);
    } catch (error) {
      // Tear the full-screen display down and re-enable the form, otherwise a
      // mid-session failure leaves the operator staring at a frozen white
      // fullscreen dialog with no way back.
      setDialogOpen(false);
      setLoading(false);
      await logEvent(`Error during recording sequence: ${error.message}`, subjectName, runID);
      setStatusMessage(`Error: ${error.message}`);
      console.error("Error during recording sequence:", error);
    }
  };

  // Handle form submission.
  const handleSubmit = async (e) => {
    e.preventDefault();
    await runRecordingSequence();
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Start EEG Recording
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          select
          label="Experiment"
          value={experimentId}
          onChange={(e) => setExperimentId(e.target.value)}
          helperText={experiment.description}
          required
        >
          {EXPERIMENT_IDS.map((id) => (
            <MenuItem key={id} value={id}>
              {EXPERIMENTS[id].label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Trials"
          type="number"
          value={numTrials}
          onChange={(e) => setNumTrials(e.target.value)}
          required
          InputProps={{ inputProps: { step: 1, min: 1 } }}
        />
        <TextField
          label="Cursor Duration (seconds)"
          type="number"
          value={cursorDuration}
          onChange={(e) => setCursorDuration(e.target.value)}
          required
          InputProps={{ inputProps: { step: 0.01, min: 0.01 } }}
        />
        <TextField
          label="Word Duration (seconds)"
          type="number"
          value={wordDuration}
          onChange={(e) => setWordDuration(e.target.value)}
          required
          InputProps={{ inputProps: { step: 0.01, min: 0.01 } }}
        />
        <TextField
          label="Subject Name"
          type="text"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          required
        />
        <Button type="submit" variant="contained" color="primary" disabled={loading}>
          {loading ? <CircularProgress size={24} color="inherit" /> : "Start Recording"}
        </Button>
        <Button variant="outlined" color="secondary" onClick={runTestSequence} disabled={loading}>
          Test Run (1 trial, no recording)
        </Button>
      </Box>
      {statusMessage && (
        <Box mt={2}>
          <Alert severity={statusMessage.startsWith("Error") ? "error" : "success"}>
            {statusMessage}
          </Alert>
        </Box>
      )}

      {/* Full-screen dialog acting as the recording display */}
      <Dialog
        open={dialogOpen}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: "white",
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: "100vh",
          }
        }}
      >
        <DialogContent
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            width: "100%",
          }}
        >
          <Typography variant="h1" align="center" sx={{ color: textColor, fontSize: "6rem" }}>
            {displayText}
          </Typography>
        </DialogContent>
      </Dialog>
    </Container>
  );
}

export default App;

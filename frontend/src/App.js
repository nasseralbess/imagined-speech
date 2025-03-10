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
  Alert
} from '@mui/material';

// A helper function to shuffle an array using the Fisher-Yates algorithm
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const num_trials = 5;

// ... [other helper functions remain unchanged]

function App() {
  // Form state and UI state remain unchanged.
  const [cursorDuration, setCursorDuration] = useState(0.25); // seconds
  const [wordDuration, setWordDuration] = useState(1);        // seconds
  const [subjectName, setSubjectName] = useState('Test1');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Full-screen display state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [textColor, setTextColor] = useState("black");

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
  const startRecording = async (subjectName, runID, randomizedPairs) => {
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
          sequence: randomizedPairs,
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

  // New function to stop recording on the backend.
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

  // Main UI sequence: process word pairs sequentially.
  const runRecordingSequence = async () => {
    // Use timestamp as unique run ID.
    const runID = Date.now();
    // First set of word pairs (flat array)
    let defaultWordPairs = [
      "Flower", "Flour",
      "Knight", "Night",
      "Sun", "Son",
      "Right", "Write",
      "Pair", "Pear",
      "Sea", "See"
    ];
    // Shuffle once and store the flat list.
    let randomizedPairs = shuffleArray(defaultWordPairs);
    setLoading(true);
    setStatusMessage("Starting recording...");
    await startRecording(subjectName, runID, randomizedPairs);
    await logEvent("Starting delay period", subjectName, runID);
    openFullScreenDisplay();

    try {
      for (let trial = 0; trial < num_trials; trial++) {
        // First block with the first set of word pairs.
        defaultWordPairs = [
          "Flower", "Flour",
          "Knight", "Night",
          "Sun", "Son",
          "Right", "Write",
          "Pair", "Pear",
          "Sea", "See"
        ];
        randomizedPairs = shuffleArray(defaultWordPairs);
        console.log("Randomized Pairs:", randomizedPairs);

        // Iterate in steps of 2 since our list is flat.
        for (let i = 0; i < randomizedPairs.length; i += 2) {
          const firstWord = randomizedPairs[i];
          const secondWord = randomizedPairs[i + 1];
          await logEvent(`Starting pair ${i/2 + 1}: [${firstWord}, ${secondWord}]`, subjectName, runID);

          // First word block:
          updateDisplay("+", "black", subjectName, runID);
          await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (before first word)`, subjectName, runID);
          await preciseDelay(parseFloat(cursorDuration) * 1000);

          updateDisplay(firstWord, "lightblue", subjectName, runID);
          await logEvent(`Displayed first word '${firstWord}' for ${wordDuration} seconds`, subjectName, runID);
          await preciseDelay(parseFloat(wordDuration) * 1000);

          updateDisplay("+", "black", subjectName, runID);
          await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (repeating first word)`, subjectName, runID);
          await preciseDelay(parseFloat(cursorDuration) * 1000);

          updateDisplay(firstWord, "blue", subjectName, runID);
          await logEvent(`Displayed first word '${firstWord}' again for ${wordDuration} seconds`, subjectName, runID);
          await preciseDelay(parseFloat(wordDuration) * 1000);

          // Second word block:
          updateDisplay("+", "black", subjectName, runID);
          await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (transitioning to second word)`, subjectName, runID);
          await preciseDelay(parseFloat(cursorDuration) * 1000);

          updateDisplay(secondWord, "lightblue", subjectName, runID);
          await logEvent(`Displayed second word '${secondWord}' for ${wordDuration} seconds`, subjectName, runID);
          await preciseDelay(parseFloat(wordDuration) * 1000);

          updateDisplay("+", "black", subjectName, runID);
          await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (repeating second word)`, subjectName, runID);
          await preciseDelay(parseFloat(cursorDuration) * 1000);

          updateDisplay(secondWord, "blue", subjectName, runID);
          await logEvent(`Displayed second word '${secondWord}' again for ${wordDuration} seconds`, subjectName, runID);
          await preciseDelay(parseFloat(wordDuration) * 1000);
        }

        // Second block with a different set of word pairs.
        defaultWordPairs = [
          "Quick", "Fast",
          "Smart", "Clever",
          "Big", "Large",
          "Pair", "Couple",
          "Sea", "See",
          "up", "down",
          "left", "right"
        ];
        randomizedPairs = shuffleArray(defaultWordPairs);
        console.log("Randomized Pairs:", randomizedPairs);
        updateDisplay("+", "black", subjectName, runID);
        await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (before first word)`, subjectName, runID);
        await preciseDelay(parseFloat(cursorDuration) * 1000);

        for (let i = 0; i < randomizedPairs.length; i += 2) {
          const firstWord = randomizedPairs[i];
          const secondWord = randomizedPairs[i + 1];
          await logEvent(`Starting pair ${i/2 + 1}: [${firstWord}, ${secondWord}]`, subjectName, runID);

          // First word block:
          updateDisplay("+", "black", subjectName, runID);
          await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (before first word)`, subjectName, runID);
          await preciseDelay(parseFloat(cursorDuration) * 1000);

          updateDisplay(firstWord, "lightblue", subjectName, runID);
          await logEvent(`Displayed first word '${firstWord}' for ${wordDuration} seconds`, subjectName, runID);
          await preciseDelay(parseFloat(wordDuration) * 1000);

          updateDisplay("+", "black", subjectName, runID);
          await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (repeating first word)`, subjectName, runID);
          await preciseDelay(parseFloat(cursorDuration) * 1000);

          updateDisplay(firstWord, "blue", subjectName, runID);
          await logEvent(`Displayed first word '${firstWord}' again for ${wordDuration} seconds`, subjectName, runID);
          await preciseDelay(parseFloat(wordDuration) * 1000);

          // Second word block:
          updateDisplay("+", "black", subjectName, runID);
          await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (transitioning to second word)`, subjectName, runID);
          await preciseDelay(parseFloat(cursorDuration) * 1000);

          updateDisplay(secondWord, "lightblue", subjectName, runID);
          await logEvent(`Displayed second word '${secondWord}' for ${wordDuration} seconds`, subjectName, runID);
          await preciseDelay(parseFloat(wordDuration) * 1000);

          updateDisplay("+", "black", subjectName, runID);
          await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (repeating second word)`, subjectName, runID);
          await preciseDelay(parseFloat(cursorDuration) * 1000);

          updateDisplay(secondWord, "blue", subjectName, runID);
          await logEvent(`Displayed second word '${secondWord}' again for ${wordDuration} seconds`, subjectName, runID);
          await preciseDelay(parseFloat(wordDuration) * 1000);
        }
        updateDisplay("+", "black", subjectName, runID);
        await logEvent(`Displayed cross ('+') for ${cursorDuration} seconds (before first word)`, subjectName, runID);
        await preciseDelay(parseFloat(cursorDuration) * 1000);
      }
      
      // Once UI sequence is done, close the display.
      closeFullScreenDisplay(subjectName, runID);
      setStatusMessage("UI sequence completed. Stopping recording shortly...");

      // Wait a slight delay (e.g., 1 second) after UI calls before stopping the recording.
      await preciseDelay(1000);

      // Call new endpoint to stop the recording.
      await stopRecording(runID, subjectName);
      setStatusMessage("Recording completed successfully!");
    } catch (error) {
      await logEvent(`Error during recording sequence: ${error.message}`, subjectName, runID);
      setStatusMessage(`Error: ${error.message}`);
      console.error("Error during recording sequence:", error);
    }
    setLoading(false);
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

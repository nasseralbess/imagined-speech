// App.js
import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Dialog,
  DialogContent,
  CircularProgress,
  Alert
} from '@mui/material';

/**
 * This React component implements a recording interface similar in logic to your plain HTML/JS example.
 * It uses MUI components for a modern UI.
 */
function App() {
  // Form state
  const [delayDuration, setDelayDuration] = useState(4);
  const [cursorDuration, setCursorDuration] = useState(2);
  const [wordDuration, setWordDuration] = useState(1);
  const [selectedWord, setSelectedWord] = useState('flower');
  const [subjectName, setSubjectName] = useState('Bread');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Run counter state (for tracking the two sessions)
  const [runCounter, setRunCounter] = useState(1);

  // State for the full-screen display dialog (instead of opening a new window)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState("white");


  // Helper delay function that returns a promise
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Log events to the backend
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

  const startRecordingSession = async (duration, subjectName, runID) => {
    const dataFileName = `${subjectName}_data_run${runID}.json`;
    await logEvent(`Preparing to start recording. Data file will be: ${dataFileName}`, subjectName, runID);
    try {
      const response = await fetch('http://127.0.0.1:8000/start_recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration: parseFloat(duration),
          subject_name: subjectName,
          run_id: runID
        })
      });


      const data = await response.json(); 
      console.log(data.status);
      if (data.status === "error") {
        await logEvent(`Error: ${data.message}`, subjectName, runID);
        throw new Error(data.message); 
      }
  
      if (data.status === "Recording started") {
        await logEvent(`Recording started successfully. Data file: ${dataFileName}`, subjectName, runID);
      } else {
        await logEvent(`Unexpected response from server: ${JSON.stringify(data)}`, subjectName, runID);
        throw new Error("Unexpected server response");
      }
    } catch (error) {
      await logEvent(`Failed to start recording: ${error.message}`, subjectName, runID);
      throw error;
    }
  };

  const updateDisplay = (text, bgColor, subjectName, runID) => {
    setDisplayText(text);
    setBackgroundColor(bgColor); // Correctly defined now
    logEvent(`Updated display to '${text}' with background '${bgColor}'`, subjectName, runID);
  };
  
  
  

  // Open and close the full-screen dialog
  const openFullScreenDisplay = () => setDialogOpen(true);
  const closeFullScreenDisplay = (subjectName, runID) => {
    setDialogOpen(false);
    logEvent("Recording display closed", subjectName, runID);
  };
  const preciseDelay = async (ms) => {
    const start = performance.now();
    await new Promise((resolve) => setTimeout(resolve, ms));
    const end = performance.now();
    console.log(`Expected delay: ${ms}ms, Actual delay: ${end - start}ms`);
  };
  

  const startRecordingSequence = async (delayMs, cursorMs, wordMs, selectedWord, subjectName) => {
    try {
      await logEvent("Starting delay period", subjectName, runCounter);
      await preciseDelay(delayMs);
      await logEvent(`Delay of ${delayMs / 1000} seconds completed`, subjectName, runCounter);
  
      // Open UI and display '+' (KEEP UI OPEN)
      openFullScreenDisplay();
      updateDisplay("+", "white", subjectName, runCounter);
      await logEvent(`Displayed '+' for ${cursorMs / 1000} seconds`, subjectName, runCounter);
      await preciseDelay(cursorMs);
  

      await logEvent(`Requesting recording session for '${selectedWord}' in orange`, subjectName, runCounter);
      try {
        await startRecordingSession(wordMs / 1000, subjectName, runCounter);
      } catch (error) {
        await logEvent(`Recording failed: ${error.message}`, subjectName, runCounter);
        throw error; // Stop the sequence if recording session fails
      }
  
      updateDisplay(selectedWord, "lightblue", subjectName, runCounter);
      await logEvent(`Displayed word '${selectedWord}' in orange for ${wordMs / 1000} seconds`, subjectName, runCounter);
      await preciseDelay(wordMs);
      await logEvent(`Recording session completed for '${selectedWord}' in orange`, subjectName, runCounter);
  
      // SECOND RUN (Blue)
      setRunCounter((prev) => prev + 1);
      const secondRun = runCounter + 1;
  
      updateDisplay("+", "white", subjectName, secondRun);
      await logEvent(`Displayed '+' for second session for ${cursorMs / 1000} seconds`, subjectName, secondRun);
      await preciseDelay(cursorMs);
  
      await logEvent(`Requesting recording session for '${selectedWord}' in blue`, subjectName, secondRun);
      try {
        await startRecordingSession(wordMs / 1000, subjectName, secondRun);
      } catch (error) {
        await logEvent(`Recording failed: ${error.message}`, subjectName, secondRun);
        throw error; // Stop the sequence if recording session fails
      }
  
      updateDisplay(selectedWord, "blue", subjectName, secondRun);
      await logEvent(`Displayed word '${selectedWord}' in blue for ${wordMs / 1000} seconds`, subjectName, secondRun);
      await preciseDelay(wordMs);
      await logEvent(`Recording session completed for '${selectedWord}' in blue`, subjectName, secondRun);
  
      // Close UI AFTER both runs finish
      closeFullScreenDisplay(subjectName, secondRun);
    } catch (error) {
      await logEvent(`Error during recording sequence: ${error.message}`, subjectName, runCounter);
      throw error; // Ensure the error stops the sequence
    }
  };
  
  

  // Handle form submission and initiate the sequence
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage("Starting recording...");
    const delayMs = parseFloat(delayDuration) * 1000;
    const cursorMs = parseFloat(cursorDuration) * 1000;
    const wordMs = parseFloat(wordDuration) * 1000;

    try {
      await startRecordingSequence(delayMs, cursorMs, wordMs, selectedWord, subjectName);
      setStatusMessage("Recording completed successfully!");
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Start EEG Recording
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
      <TextField
        label="Delay Duration (seconds)"
        type="number"
        value={delayDuration}
        onChange={(e) => setDelayDuration(e.target.value)}
        required
        InputProps={{ inputProps: { step: 0.1, min: 0 } }} 
      />
      <TextField
        label="Cursor Duration (seconds)"
        type="number"
        value={cursorDuration}
        onChange={(e) => setCursorDuration(e.target.value)}
        required
        InputProps={{ inputProps: { step: 0.1, min: 0.1 } }} 
      />
      <TextField
        label="Word Duration (seconds)"
        type="number"
        value={wordDuration}
        onChange={(e) => setWordDuration(e.target.value)}
        required
        InputProps={{ inputProps: { step: 0.1, min: 0.1 } }} 
      />

        <FormControl fullWidth required>
          <InputLabel id="word-select-label">Select Word</InputLabel>
          <Select
            labelId="word-select-label"
            value={selectedWord || 'flower'} // default value 'flower'
            label="Select Word"
            onChange={(e) => setSelectedWord(e.target.value)}
          >
            <MenuItem value="flower">Flower</MenuItem>
            <MenuItem value="flour">Flour</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Subject Name"
          type="text"
          value={subjectName || 'Bread'} // default value 'Bread'
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
      backgroundColor: backgroundColor, // Now this works
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }
  }}
>
  <DialogContent>
    <Typography variant="h1" align="center" sx={{ color: "black" }}>
      {displayText} {/* Always black text */}
    </Typography>
  </DialogContent>
</Dialog>

    </Container>
  );
}

export default App;

import React, { useState, useEffect, useRef } from "react";
import { Neurosity } from "@neurosity/sdk";

const DEVICE_ID = import.meta.env.REACT_APP_NEUROSITY_DEVICE_ID || "";
const EMAIL = import.meta.env.REACT_APP_NEUROSITY_EMAIL || "";
const PASSWORD = import.meta.env.REACT_APP_NEUROSITY_PASSWORD || "";

/**
 * P300 Speller (Mocked "Free Will") with Calm Probability Streaming
 *
 * - Connects to Neurosity using @neurosity/sdk
 * - Displays a 5x6 grid of letters
 * - Randomly flashes a row or column
 * - Streams the calm metric in real-time, displayed on screen
 * - If calm > 0.3, we “select” the last flashed row/col
 */
const P300SpellerMocked = () => {
    // Basic device connection states
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState("");
  
    // Live calm data displayed on screen
    const [calmProbability, setCalmProbability] = useState(0);
  
    // Flash states
    const [highlightedRow, setHighlightedRow] = useState(null);
    const [highlightedCol, setHighlightedCol] = useState(null);
  
    // Keep track of the row/col "flash events"
    const [flashEvents, setFlashEvents] = useState([]);
  
    // Row & column selected by the user (via calm threshold)
    const [selectedRow, setSelectedRow] = useState(null);
    const [selectedCol, setSelectedCol] = useState(null);
  
    // Display the last “detected” letter
    const [detectedLetter, setDetectedLetter] = useState("");
  
    // Neurosity & intervals in refs for cleanup
    const neurosityRef = useRef(null);
    const flashIntervalRef = useRef(null);
    const calmSubRef = useRef(null);
  
    // A 5x6 grid of letters (26 letters + 2 extras)
    const rows = [
      ["A", "B", "C", "D", "E", "F"],
      ["G", "H", "I", "J", "K", "L"],
      ["M", "N", "O", "P", "Q", "R"],
      ["S", "T", "U", "V", "W", "X"],
      ["Y", "Z", "-", " ", ".", "↵"]
    ];
  
    /**
     * 1. On mount, connect to Neurosity & subscribe to calm data
     */
    useEffect(() => {
      if (!neurosityRef.current) {
        neurosityRef.current = new Neurosity({ deviceId: DEVICE_ID });
      }
  
      // Attempt login
      neurosityRef.current
        .login({ email: EMAIL, password: PASSWORD })
        .then((user) => {
          console.log("Logged in as:", user.email);
          setConnected(true);
  
          // Subscribe to calm to see streaming data
          calmSubRef.current = neurosityRef.current.calm().subscribe((calmData) => {
            const { probability } = calmData;
            console.log("Calm Probability:", probability.toFixed(3));
            setCalmProbability(probability);
  
            // If calm is above threshold, we "select" the last flash
            if (probability > 0.3) {
              handleUserSelection();
            }
          });
        })
        .catch((err) => {
          console.error("Neurosity login error:", err);
          setError(err.message || "Login failed");
          setConnected(false);
        });
  
      // Cleanup on unmount
      return () => {
        if (flashIntervalRef.current) {
          clearInterval(flashIntervalRef.current);
        }
        if (calmSubRef.current) {
          calmSubRef.current.unsubscribe();
        }
      };
      // eslint-disable-next-line
    }, []);
  
    /**
     * 2. Flash a row or column randomly
     */
    const randomFlash = () => {
      const rowCount = rows.length; // 5
      const colCount = rows[0].length; // 6
  
      const flashRow = Math.random() > 0.5;
      const timestamp = Date.now();
  
      if (flashRow) {
        const r = Math.floor(Math.random() * rowCount);
        setHighlightedRow(r);
        setHighlightedCol(null);
        setFlashEvents((prev) => [
          ...prev,
          { type: "row", index: r, timestamp }
        ]);
      } else {
        const c = Math.floor(Math.random() * colCount);
        setHighlightedCol(c);
        setHighlightedRow(null);
        setFlashEvents((prev) => [
          ...prev,
          { type: "col", index: c, timestamp }
        ]);
      }
    };
  
    /**
     * 3. Start/Stop the row/column flashing
     */
    const handleStartFlashing = () => {
      if (flashIntervalRef.current) return; // already flashing
      // Flash every second
      flashIntervalRef.current = setInterval(randomFlash, 1000);
    };
  
    const handleStopFlashing = () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
      setHighlightedRow(null);
      setHighlightedCol(null);
    };
  
    /**
     * 4. "Select" the last flashed row or column if calm > 0.3
     */
    const handleUserSelection = () => {
      if (flashEvents.length === 0) return;
  
      // Grab the most recent flash event
      const lastEvent = flashEvents[flashEvents.length - 1];
      if (!lastEvent) return;
  
      console.log("User 'selected' event:", lastEvent);
  
      if (lastEvent.type === "row") {
        setSelectedRow(lastEvent.index);
        // If we already have a selectedCol, we can form a letter
        if (selectedCol !== null) {
          const letter = rows[lastEvent.index][selectedCol];
          setDetectedLetter(letter);
          // Reset or keep going (here, we reset)
          setSelectedRow(null);
          setSelectedCol(null);
        }
      } else if (lastEvent.type === "col") {
        setSelectedCol(lastEvent.index);
        // If we already have a selectedRow, we can form a letter
        if (selectedRow !== null) {
          const letter = rows[selectedRow][lastEvent.index];
          setDetectedLetter(letter);
          // Reset or keep going
          setSelectedRow(null);
          setSelectedCol(null);
        }
      }
    };
  
    return (
      <div style={styles.container}>
        <h2>P300 Speller (Mocked "Free Will")</h2>
        {error && <p style={{ color: "red" }}>Error: {error}</p>}
  
        {connected ? (
          <>
            <p style={{ color: "green" }}>Device connected</p>
            {/* Show calm data streaming in */}
            <p>Calm Probability: {calmProbability.toFixed(3)}</p>
  
            <div>
              <button onClick={handleStartFlashing} disabled={flashIntervalRef.current}>
                Start Flashing
              </button>
              <button onClick={handleStopFlashing} disabled={!flashIntervalRef.current}>
                Stop Flashing
              </button>
            </div>
  
            <p>Selected Row: {selectedRow === null ? "-" : selectedRow}</p>
            <p>Selected Col: {selectedCol === null ? "-" : selectedCol}</p>
  
            {/* The letter grid */}
            <div style={styles.grid}>
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} style={styles.row}>
                  {row.map((letter, colIndex) => {
                    const isHighlighted =
                      rowIndex === highlightedRow || colIndex === highlightedCol;
                    const isSelected =
                      rowIndex === selectedRow || colIndex === selectedCol;
                    return (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        style={{
                          ...styles.cell,
                          backgroundColor: isHighlighted
                            ? "#fceb4f"
                            : isSelected
                            ? "#a2ffa2"
                            : "#eee"
                        }}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
  
            <h4>Detected Letter: {detectedLetter}</h4>
            <p>
              This example "detects" letters by combining the **last flashed
              row/col** event with a calm threshold crossing. Meanwhile, you can
              see the Calm Probability updating in real-time above.
            </p>
          </>
        ) : (
          <p>Connecting...</p>
        )}
      </div>
    );
  };
  
  export default P300SpellerMocked;
  
  const styles = {
    container: {
      margin: "20px auto",
      maxWidth: 600,
      textAlign: "center",
      padding: 20,
      border: "1px solid #ccc",
      borderRadius: 8
    },
    grid: {
      display: "inline-block",
      marginTop: 20,
      border: "1px solid #ccc"
    },
    row: {
      display: "flex"
    },
    cell: {
      width: 50,
      height: 50,
      border: "1px solid #ccc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "bold",
      margin: 2,
      cursor: "default",
      userSelect: "none"
    }
  };
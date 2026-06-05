import React, { useEffect } from "react";
import { Play, Pause, RotateCcw, XCircle } from "lucide-react";

function ReplayControl({ 
  isPlaying, 
  setIsPlaying, 
  trackData = [], 
  currentIndex, 
  setCurrentIndex, 
  onClose 
}) {
  
  useEffect(() => {
    let interval = null;
    if (isPlaying && trackData.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= trackData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 800);
    }
    return () => clearInterval(interval);
  }, [isPlaying, trackData, setIsPlaying, setCurrentIndex]);

  if (trackData.length === 0) {
    return (
      <div className="replay-panel">
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          No trajectory data found for playback.
        </span>
      </div>
    );
  }

  const currentPoint = trackData[currentIndex] || {};
  const formattedTime = currentPoint.timestamp 
    ? new Date(currentPoint.timestamp).toLocaleString()
    : "Unknown Date";

  return (
    <div className="replay-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--accent-color)" }}>
          HISTORICAL TRACK REPLAY ({trackData.length} points)
        </span>
        <button 
          onClick={onClose} 
          style={{ 
            background: "none", 
            border: "none", 
            color: "var(--critical)", 
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "0.75rem"
          }}
        >
          <XCircle size={14} /> Exit Replay
        </button>
      </div>

      <div className="replay-buttons">
        <button 
          className="replay-btn"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          <span>{isPlaying ? "Pause" : "Play"}</span>
        </button>

        <button 
          className="replay-btn"
          onClick={() => {
            setIsPlaying(false);
            setCurrentIndex(0);
          }}
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>

        <div style={{ flex: 1, marginLeft: "10px" }} className="replay-slider-container">
          <input
            type="range"
            min="0"
            max={trackData.length - 1}
            value={currentIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentIndex(parseInt(e.target.value));
            }}
            className="replay-slider"
          />
          <div className="replay-time-display">
            <span>Frame {currentIndex + 1} / {trackData.length}</span>
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReplayControl;

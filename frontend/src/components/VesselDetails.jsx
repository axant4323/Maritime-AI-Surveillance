import React, { useState } from "react";
import { X, PlayCircle, Loader2 } from "lucide-react";
import ReplayControl from "./ReplayControl";

function VesselDetails({ 
  vessel, 
  onClose,
  replayMode,
  setReplayMode,
  replayTrack,
  setReplayTrack,
  replayIndex,
  setReplayIndex,
  isReplayPlaying,
  setIsReplayPlaying
}) {
  const [loadingTrack, setLoadingTrack] = useState(false);

  const startReplay = async () => {
    if (!vessel) return;
    setLoadingTrack(true);
    try {
      const response = await fetch(`http://localhost:5000/api/vessels/${vessel.mmsi}/track`);
      if (response.ok) {
        const data = await response.json();
        setReplayTrack(data);
        setReplayIndex(0);
        setReplayMode(true);
      }
    } catch (error) {
      console.error("Error loading track data:", error);
    } finally {
      setLoadingTrack(false);
    }
  };

  const getThreatColor = (score) => {
    if (score < 20) return "var(--normal)";
    if (score < 40) return "var(--monitor)";
    if (score < 60) return "var(--voi)";
    if (score < 80) return "var(--high-risk)";
    return "var(--critical)";
  };

  if (!vessel) return null;

  return (
    <div className={`details-drawer ${vessel ? "open" : ""}`}>
      <div className="drawer-header">
        <div className="drawer-title-group">
          <h3>{vessel.name || "Unknown Vessel"}</h3>
          <span 
            className="alert-badge" 
            style={{ 
              backgroundColor: `${getThreatColor(vessel.threatScore)}25`, 
              color: getThreatColor(vessel.threatScore),
              border: `1px solid ${getThreatColor(vessel.threatScore)}50`
            }}
          >
            {vessel.voiLevel || "Normal"}
          </span>
        </div>
        <button className="drawer-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="drawer-content">
        <div className="info-grid">
          <div className="info-cell">
            <span className="info-lbl">MMSI</span>
            <span className="info-val">{vessel.mmsi}</span>
          </div>
          <div className="info-cell">
            <span className="info-lbl">Vessel Type</span>
            <span className="info-val">{vessel.vesselType || "Other"}</span>
          </div>
          <div className="info-cell">
            <span className="info-lbl">Latitude</span>
            <span className="info-val">{vessel.lat?.toFixed(5) || "0.00000"}</span>
          </div>
          <div className="info-cell">
            <span className="info-lbl">Longitude</span>
            <span className="info-val">{vessel.lon?.toFixed(5) || "0.00000"}</span>
          </div>
          <div className="info-cell">
            <span className="info-lbl">Speed</span>
            <span className="info-val">{vessel.speed?.toFixed(1) || "0.0"} knots</span>
          </div>
          <div className="info-cell">
            <span className="info-lbl">Heading</span>
            <span className="info-val">{vessel.heading || "0"}°</span>
          </div>
          <div className="info-cell">
            <span className="info-lbl">Destination</span>
            <span className="info-val">{vessel.destination || "Unknown"}</span>
          </div>
          <div className="info-cell">
            <span className="info-lbl">ETA</span>
            <span className="info-val">{vessel.eta || "Unknown"}</span>
          </div>
        </div>

        <div className="threat-gauge-panel">
          <div 
            className="threat-score-radial" 
            style={{ 
              "--score-color": getThreatColor(vessel.threatScore),
              "--score-percent": vessel.threatScore || 0
            }}
          >
            <div className="threat-score-val">
              {vessel.threatScore || 0}
              <span>Threat</span>
            </div>
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: "600", color: getThreatColor(vessel.threatScore) }}>
            {vessel.threatScore >= 80 ? "CRITICAL ALERT" : vessel.threatScore >= 60 ? "HIGH RISK DETECTED" : "MONITOR ACTIVE"}
          </div>
        </div>

        {vessel.topReasons && vessel.topReasons.length > 0 && (
          <div className="ai-reasons-panel" style={{ marginTop: "15px", padding: "10px", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span role="img" aria-label="ai">🧠</span> AI Flag Reasons
            </h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {vessel.topReasons.map((reason, idx) => (
                <li key={idx} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
                  <span>{reason.feature}</span>
                  <span style={{ color: getThreatColor(vessel.threatScore), fontWeight: "bold" }}>+{Math.round(reason.impact * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {replayMode ? (
          <ReplayControl
            isPlaying={isReplayPlaying}
            setIsPlaying={setIsReplayPlaying}
            trackData={replayTrack}
            currentIndex={replayIndex}
            setCurrentIndex={setReplayIndex}
            onClose={() => {
              setReplayMode(false);
              setIsReplayPlaying(false);
              setReplayTrack([]);
            }}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: "20px" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "15px" }}>
              Analysing vessel trajectory pattern in real-time. You can replay the vessel's journey over the past 24 hours.
            </p>
            <button 
              className="replay-btn" 
              onClick={startReplay} 
              disabled={loadingTrack}
              style={{ width: "fit-content", padding: "10px 20px" }}
            >
              {loadingTrack ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span>Loading Tracks...</span>
                </>
              ) : (
                <>
                  <PlayCircle size={16} />
                  <span>Initiate Route Replay</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VesselDetails;

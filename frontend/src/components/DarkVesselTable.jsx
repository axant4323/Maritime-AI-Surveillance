import React from "react";

function DarkVesselTable({ darkVessels }) {
  if (!darkVessels || darkVessels.length === 0) {
    return (
      <div className="dark-vessel-table-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        <p>No dark vessel alerts generated.</p>
      </div>
    );
  }

  const getThreatColor = (level) => {
    switch (level) {
      case "Critical": return "var(--critical)";
      case "High Risk": return "var(--high-risk)";
      case "Vessel of Interest": return "var(--voi)";
      case "Monitor": return "var(--monitor)";
      default: return "var(--normal)";
    }
  };

  return (
    <div className="dark-vessel-table-container" style={{ overflowY: "auto" }}>
      <table className="dark-vessel-table">
        <thead>
          <tr>
            <th>Alert ID</th>
            <th>Lat / Lon</th>
            <th>Confidence</th>
            <th>AIS Match</th>
            <th>Threat Level</th>
          </tr>
        </thead>
        <tbody>
          {darkVessels.map((vessel, idx) => (
            <tr key={idx} style={{ 
              backgroundColor: vessel.voiLevel === "Critical" ? "rgba(239, 68, 68, 0.1)" : "transparent",
              animation: vessel.voiLevel === "Critical" ? "pulse-bg 2s infinite" : "none" 
            }}>
              <td>#{vessel.id || Math.floor(Math.random() * 10000)}</td>
              <td>{vessel.lat.toFixed(4)}, {vessel.lon.toFixed(4)}</td>
              <td>{(vessel.confidence * 100).toFixed(1)}%</td>
              <td>
                {vessel.isDarkVessel ? (
                  <span style={{ color: "var(--critical)" }}>Unmatched (Dark)</span>
                ) : (
                  <span style={{ color: "var(--normal)" }}>Matched ({vessel.nearestAisMmsi})</span>
                )}
              </td>
              <td style={{ color: getThreatColor(vessel.voiLevel), fontWeight: "bold" }}>
                {vessel.voiLevel} ({vessel.threatScore}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <style>{`
        @keyframes pulse-bg {
          0% { background-color: rgba(239, 68, 68, 0.05); }
          50% { background-color: rgba(239, 68, 68, 0.15); }
          100% { background-color: rgba(239, 68, 68, 0.05); }
        }
      `}</style>
    </div>
  );
}

export default DarkVesselTable;

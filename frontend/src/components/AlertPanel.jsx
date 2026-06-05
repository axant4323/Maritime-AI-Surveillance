import React from "react";
import { AlertCircle, Eye } from "lucide-react";

function AlertPanel({ alerts = [], onSelectVessel, onClearAlerts }) {
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return "00:00:00";
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case "Critical": return "critical";
      case "High Risk": return "high-risk";
      case "Vessel of Interest": return "voi";
      case "Monitor": return "monitor";
      default: return "normal";
    }
  };

  return (
    <div className="alert-panel">
      <div className="alert-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={16} style={{ color: "var(--critical)" }} />
          <h2>Surveillance Logs</h2>
        </div>
        {alerts.length > 0 && (
          <button className="clear-btn" onClick={onClearAlerts}>
            Clear Logs
          </button>
        )}
      </div>
      <div className="alert-list">
        {alerts.length === 0 ? (
          <div style={{ 
            textAlign: "center", 
            color: "var(--text-secondary)", 
            padding: "40px 10px", 
            fontSize: "0.85rem" 
          }}>
            No anomalies detected in the sector.
          </div>
        ) : (
          alerts.map((alert) => (
            <div 
              key={alert._id || alert.id || Math.random().toString()} 
              className="alert-item"
              onClick={() => onSelectVessel(alert.vesselMmsi)}
            >
              <div className="alert-item-header">
                <span className={`alert-badge ${getSeverityClass(alert.severity)}`}>
                  {alert.severity}
                </span>
                <span className="alert-time">{formatTime(alert.timestamp)}</span>
              </div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-vessel" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Eye size={12} />
                <span>Track Vessel (MMSI: {alert.vesselMmsi})</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AlertPanel;

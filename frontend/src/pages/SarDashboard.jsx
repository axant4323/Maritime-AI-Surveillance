import React, { useState, useEffect } from "react";
import SarMap from "../components/SarMap";
import DarkVesselTable from "../components/DarkVesselTable";
import { Upload, Radar, Image as ImageIcon, AlertTriangle } from "lucide-react";
import socket from "../services/socket";

function SarDashboard({ vessels = [] }) {
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [sarDetections, setSarDetections] = useState([]);
  const [darkVessels, setDarkVessels] = useState([]);
  const [stats, setStats] = useState({
    totalSar: 0,
    matched: 0,
    darkVessels: 0,
    highRiskDark: 0
  });

  useEffect(() => {
    // Listen for real-time dark vessel alerts that might be triggered by others or background processes
    const handleDarkVesselAlert = (alert) => {
      setDarkVessels(prev => [alert, ...prev].slice(0, 100));
      
      // Also add to the map detections array so it appears as a marker!
      setSarDetections(prev => {
        // Prevent duplicates
        if (prev.some(d => d.id === alert.id)) return prev;
        return [...prev, alert].slice(-100); // Keep last 100 markers
      });

      setStats(prev => ({
        ...prev,
        darkVessels: prev.darkVessels + 1,
        highRiskDark: ["High Risk", "Critical"].includes(alert.voiLevel) ? prev.highRiskDark + 1 : prev.highRiskDark
      }));
    };

    socket.on("dark-vessel-alert", handleDarkVesselAlert);
    return () => socket.off("dark-vessel-alert", handleDarkVesselAlert);
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Normally we would upload here, but we will mock it
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
      }, 800);
    }
  };

  const runDetection = async () => {
    setIsDetecting(true);
    try {
      // Call the backend API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sar/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: "mock-uploaded-file-id" }) // Mock file ID
      });

      if (response.ok) {
        const data = await response.json();
        
        // Results are the correlated SAR detections
        setSarDetections(data.results);
        
        let dark = 0;
        let matched = 0;
        let highRisk = 0;

        data.results.forEach(res => {
          if (res.isDarkVessel) {
            dark++;
            if (res.voiLevel === "High Risk" || res.voiLevel === "Critical") {
              highRisk++;
            }
          } else {
            matched++;
          }
        });

        setStats(prev => ({
          ...prev,
          totalSar: data.totalDetections,
          matched: prev.matched + matched,
          darkVessels: prev.darkVessels + dark,
          highRiskDark: prev.highRiskDark + highRisk
        }));
        
        // Note: New dark vessel alerts are also received via socket.io, 
        // so we don't strictly need to manually add them to the table here
        // unless we want to show non-alerting detections.
      }
    } catch (err) {
      console.error("Error running SAR detection:", err);
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <div className="sar-dashboard">
      
      {/* Top Header with Auto-Scan Status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <h2 style={{ fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "1px" }}>Satellite Feed Status</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(34, 197, 94, 0.1)", padding: "6px 12px", borderRadius: "20px", border: "1px solid rgba(34, 197, 94, 0.3)" }}>
          <div className="pulse-ring" style={{ position: "relative", width: 8, height: 8, border: "none", background: "var(--normal)", left: 0, top: 0, animation: "pulse-animation 2s infinite" }}></div>
          <span style={{ fontSize: "0.8rem", color: "var(--normal)", fontWeight: "bold" }}>AUTO-SCAN ACTIVE (30s)</span>
        </div>
      </div>

      {/* Top Stats */}
      <div className="metric-grid" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div className="metric-card active">
          <span className="metric-lbl">Total AIS Vessels</span>
          <span className="metric-val">{vessels.length}</span>
        </div>
        <div className="metric-card monitor">
          <span className="metric-lbl">Total SAR Detections</span>
          <span className="metric-val">{stats.totalSar}</span>
        </div>
        <div className="metric-card active" style={{ borderColor: "var(--normal)" }}>
          <span className="metric-lbl">Matched Vessels</span>
          <span className="metric-val">{stats.matched}</span>
        </div>
        <div className="metric-card critical" style={{ borderColor: "var(--critical)" }}>
          <span className="metric-lbl">Dark Vessels</span>
          <span className="metric-val">{stats.darkVessels}</span>
        </div>
        <div className="metric-card high-risk">
          <span className="metric-lbl">High Risk Dark Vessels</span>
          <span className="metric-val">{stats.highRiskDark}</span>
        </div>
      </div>

      {/* Main Split View */}
      <div className="sar-split-view">
        {/* Left: Upload and Preview */}
        <div className="sar-panel">
          <div className="section-title">
            <span>SAR Image Input</span>
            <ImageIcon size={14} />
          </div>
          
          <input 
            type="file" 
            accept=".jpg,.png,.tif" 
            style={{ display: "none" }} 
            id="sar-upload"
            onChange={handleImageUpload}
          />
          
          {!imagePreview ? (
            <label htmlFor="sar-upload" className="sar-upload-area">
              <Upload size={32} style={{ color: "var(--text-secondary)", marginBottom: "10px" }} />
              <p>Drag & drop SAR image here</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Supports .jpg, .png, .tif (Max 10MB)</p>
            </label>
          ) : (
            <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <img src={imagePreview} alt="SAR Preview" className="sar-image-preview" />
              <button 
                className="clear-btn" 
                style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.5)" }}
                onClick={() => { setImagePreview(null); setSarDetections([]); }}
              >
                Clear
              </button>
            </div>
          )}

          <button 
            className="sar-detect-btn" 
            disabled={!imagePreview || isDetecting || isUploading}
            onClick={runDetection}
          >
            {isDetecting ? (
              <><span className="pulse-ring" style={{ position: "relative", width: 10, height: 10, border: "none", background: "white", left: 0, top: 0 }}></span> Processing...</>
            ) : (
              <><Radar size={18} /> Run Ship Detection & Correlation</>
            )}
          </button>
        </div>

        {/* Right: Map Integration */}
        <div className="sar-panel" style={{ padding: 0, border: "none", background: "transparent" }}>
           <SarMap vessels={vessels} sarDetections={sarDetections} />
        </div>
      </div>

      {/* Bottom: Alert Table */}
      <div className="sar-panel" style={{ flex: 1, padding: 0 }}>
        <div className="section-title" style={{ padding: "15px 15px 0 15px" }}>
          <span>Dark Vessel Alerts</span>
          <AlertTriangle size={14} style={{ color: "var(--critical)" }} />
        </div>
        <DarkVesselTable darkVessels={darkVessels} />
      </div>

    </div>
  );
}

export default SarDashboard;

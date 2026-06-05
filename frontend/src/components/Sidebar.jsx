import React from "react";
import { Search, Sliders, Shield, Compass, Radio, Target } from "lucide-react";

function Sidebar({ 
  stats = {}, 
  filters = {}, 
  setFilters,
  activePage = "live",
  setActivePage = () => {}
}) {
  const handleFilterChange = (key, val) => {
    setFilters(prev => ({
      ...prev,
      [key]: val
    }));
  };

  return (
    <div className="sidebar">
      <div>
        <div className="section-title">
          <span>Navigation</span>
          <Compass size={14} />
        </div>
        <div className="nav-menu">
          <div 
            className={`nav-item ${activePage === "live" ? "active" : ""}`} 
            onClick={() => setActivePage("live")}
          >
            <Radio size={16} /> Live Map
          </div>
          <div 
            className={`nav-item ${activePage === "sar" ? "active" : ""}`} 
            onClick={() => setActivePage("sar")}
          >
            <Target size={16} /> SAR Intelligence
          </div>
        </div>
      </div>

      <div style={{ display: activePage === "live" ? "block" : "none" }}>
        <div className="section-title">
          <span>Surveillance Summary</span>
          <Shield size={14} style={{ color: "var(--accent-color)" }} />
        </div>
        <div className="metric-grid">
          <div className="metric-card active">
            <span className="metric-lbl">Active Vessels</span>
            <span className="metric-val">{stats.activeVessels ?? 0}</span>
          </div>
          <div className="metric-card critical">
            <span className="metric-lbl">Critical Alerts</span>
            <span className="metric-val">{stats.criticalAlerts ?? 0}</span>
          </div>
          <div className="metric-card high-risk">
            <span className="metric-lbl">High Risk</span>
            <span className="metric-val">{stats.highRisk ?? 0}</span>
          </div>
          <div className="metric-card voi">
            <span className="metric-lbl">Vessel of Interest</span>
            <span className="metric-val">{stats.vesselOfInterest ?? 0}</span>
          </div>
          <div className="metric-card monitor">
            <span className="metric-lbl">Monitored</span>
            <span className="metric-val">{stats.monitor ?? 0}</span>
          </div>
          <div className="metric-card" style={{ borderLeft: "4px solid var(--text-secondary)" }}>
            <span className="metric-lbl">Normal</span>
            <span className="metric-val">{stats.normal ?? 0}</span>
          </div>
        </div>
      </div>

      <div style={{ display: activePage === "live" ? "block" : "none" }}>
        <div className="section-title">
          <span>Target Filtering</span>
          <Sliders size={14} />
        </div>
        <div className="filter-group">
          <div className="filter-control">
            <label>Search Identity (MMSI / Name)</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search..."
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                style={{ width: "100%", paddingRight: "30px" }}
              />
              <Search 
                size={14} 
                style={{ 
                  position: "absolute", 
                  right: "10px", 
                  top: "50%", 
                  transform: "translateY(-50%)",
                  color: "var(--text-secondary)",
                  pointerEvents: "none"
                }} 
              />
            </div>
          </div>

          <div className="filter-control">
            <label>Vessel Class</label>
            <select
              value={filters.vesselType || "All"}
              onChange={(e) => handleFilterChange("vesselType", e.target.value)}
            >
              <option value="All">All Classes</option>
              <option value="Cargo">Cargo</option>
              <option value="Tanker">Tanker</option>
              <option value="Passenger">Passenger</option>
              <option value="High Speed">High Speed</option>
              <option value="Fishing">Fishing</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="filter-control">
            <label>Threat / VOI Level</label>
            <select
              value={filters.voiLevel || "All"}
              onChange={(e) => handleFilterChange("voiLevel", e.target.value)}
            >
              <option value="All">All Threat Levels</option>
              <option value="Normal">Normal</option>
              <option value="Monitor">Monitor</option>
              <option value="Vessel of Interest">Vessel of Interest</option>
              <option value="High Risk">High Risk</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div className="filter-control">
            <div className="range-display">
              <label>Sailing Speed Range</label>
              <span>{filters.maxSpeed ?? 40} kn max</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={filters.maxSpeed ?? 40}
              onChange={(e) => handleFilterChange("maxSpeed", parseInt(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

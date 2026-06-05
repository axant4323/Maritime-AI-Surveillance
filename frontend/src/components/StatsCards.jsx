import React from "react";
import { Ship, AlertTriangle, Activity, ShieldAlert } from "lucide-react";

function StatsCards({ stats = {} }) {
  return (
    <div className="header-stats">
      <div className="stat-header-card">
        <Ship size={18} style={{ color: "var(--monitor)" }} />
        <div>
          <div className="stat-header-val">{stats.activeVessels ?? 0}</div>
          <div className="stat-header-lbl">Active Vessels</div>
        </div>
      </div>
      
      <div className="stat-header-card">
        <AlertTriangle size={18} style={{ color: "var(--critical)" }} />
        <div>
          <div className="stat-header-val">{stats.criticalAlerts ?? 0}</div>
          <div className="stat-header-lbl">Critical Alerts</div>
        </div>
      </div>

      <div className="stat-header-card">
        <Activity size={18} style={{ color: "var(--normal)" }} />
        <div>
          <div className="stat-header-val">{stats.avgSpeed ?? 0} kn</div>
          <div className="stat-header-lbl">Avg Speed</div>
        </div>
      </div>

      <div className="stat-header-card">
        <ShieldAlert size={18} style={{ color: "var(--high-risk)" }} />
        <div>
          <div className="stat-header-val">{stats.maxThreatScore ?? 0}%</div>
          <div className="stat-header-lbl">Max Threat</div>
        </div>
      </div>
    </div>
  );
}

export default StatsCards;

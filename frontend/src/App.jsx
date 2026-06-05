import React, { useState, useEffect, useMemo } from "react";
import { Shield, Radio } from "lucide-react";
import socket from "./services/socket";
import StatsCards from "./components/StatsCards";
import Sidebar from "./components/Sidebar";
import VesselMap from "./components/VesselMap";
import AlertPanel from "./components/AlertPanel";
import VesselDetails from "./components/VesselDetails";
import SarDashboard from "./pages/SarDashboard";

function App() {
  const [activePage, setActivePage] = useState("live");
  const [vessels, setVessels] = useState({});
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    activeVessels: 0,
    criticalAlerts: 0,
    highRisk: 0,
    vesselOfInterest: 0,
    monitor: 0,
    normal: 0,
    avgSpeed: 0,
    maxThreatScore: 0
  });

  const [filters, setFilters] = useState({
    search: "",
    vesselType: "All",
    voiLevel: "All",
    maxSpeed: 40
  });

  const [replayMode, setReplayMode] = useState(false);
  const [replayTrack, setReplayTrack] = useState([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isReplayPlaying, setIsReplayPlaying] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [vesselsRes, alertsRes, statsRes] = await Promise.all([
          fetch("http://localhost:5000/api/vessels"),
          fetch("http://localhost:5000/api/alerts"),
          fetch("http://localhost:5000/api/statistics")
        ]);

        if (vesselsRes.ok) {
          const vesselsData = await vesselsRes.json();
          const vesselsMap = {};
          vesselsData.forEach(v => {
            vesselsMap[v.mmsi] = v;
          });
          setVessels(vesselsMap);
        }

        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error("Error fetching initial dashboard data:", err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("http://localhost:5000/api/statistics");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error polling stats:", error);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    socket.on("initial-vessels", (vesselsList) => {
      const vesselsMap = {};
      vesselsList.forEach(v => {
        vesselsMap[v.mmsi] = v;
      });
      setVessels(vesselsMap);
    });

    socket.on("vessel-update", (vessel) => {
      setVessels(prev => {
        const updated = { ...prev, [vessel.mmsi]: vessel };
        if (selectedVessel && selectedVessel.mmsi === vessel.mmsi && !replayMode) {
          setSelectedVessel(vessel);
        }
        return updated;
      });
    });

    socket.on("vessel-alert", (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 100));
      setStats(prev => ({
        ...prev,
        criticalAlerts: alert.severity === "Critical" ? prev.criticalAlerts + 1 : prev.criticalAlerts
      }));
    });

    socket.on("vessel-enter-zone", (data) => {
      console.log("Zone entry detected:", data);
    });

    return () => {
      socket.off("initial-vessels");
      socket.off("vessel-update");
      socket.off("vessel-alert");
      socket.off("vessel-enter-zone");
    };
  }, [selectedVessel, replayMode]);

  const handleClearAlerts = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/alerts/clear", { method: "POST" });
      if (response.ok) {
        setAlerts([]);
        setStats(prev => ({ ...prev, criticalAlerts: 0 }));
      }
    } catch (error) {
      console.error("Error clearing alerts:", error);
    }
  };

  const handleSelectVesselByMmsi = async (mmsi) => {
    const vessel = vessels[mmsi];
    if (vessel) {
      handleSelectVessel(vessel);
    } else {
      try {
        const res = await fetch(`http://localhost:5000/api/vessels/${mmsi}`);
        if (res.ok) {
          const vData = await res.json();
          handleSelectVessel(vData);
        }
      } catch (err) {
        console.error("Error fetching single vessel:", err);
      }
    }
  };

  const handleSelectVessel = async (vessel) => {
    setSelectedVessel(vessel);
    setReplayMode(false);
    setReplayTrack([]);
    
    try {
      const res = await fetch(`http://localhost:5000/api/vessels/${vessel.mmsi}/track`);
      if (res.ok) {
        const track = await res.json();
        setReplayTrack(track);
      }
    } catch (err) {
      console.error("Error fetching vessel trail:", err);
    }
  };

  const filteredVessels = useMemo(() => {
    return Object.values(vessels).filter(v => {
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const mmsiMatch = v.mmsi.toLowerCase().includes(term);
        const nameMatch = v.name ? v.name.toLowerCase().includes(term) : false;
        if (!mmsiMatch && !nameMatch) return false;
      }
      if (filters.vesselType !== "All" && v.vesselType !== filters.vesselType) {
        return false;
      }
      if (filters.voiLevel !== "All" && v.voiLevel !== filters.voiLevel) {
        return false;
      }
      if (v.speed > filters.maxSpeed) {
        return false;
      }
      return true;
    });
  }, [vessels, filters]);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-title">
          <Shield size={24} style={{ color: "var(--accent-color)" }} />
          <h1>Maritime AI Surveillance Platform</h1>
          <span>COMMAND CENTER</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--normal)" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--normal)", animation: "pulse-animation 1.5s ease-out infinite" }}></div>
            <span>LIVE AIS FEED</span>
          </div>
          <StatsCards stats={stats} />
        </div>
      </header>

      <Sidebar 
        stats={stats} 
        filters={filters} 
        setFilters={setFilters}
        activePage={activePage}
        setActivePage={setActivePage}
      />

      {activePage === "live" ? (
        <>
          <VesselMap
            vessels={filteredVessels}
            selectedVessel={selectedVessel}
            onSelectVessel={handleSelectVessel}
            replayMode={replayMode}
            replayTrack={replayTrack}
            replayIndex={replayIndex}
          />

          <AlertPanel
            alerts={alerts}
            onSelectVessel={handleSelectVesselByMmsi}
            onClearAlerts={handleClearAlerts}
          />

          {selectedVessel && (
            <VesselDetails
              vessel={selectedVessel}
              onClose={() => {
                setSelectedVessel(null);
                setReplayMode(false);
                setReplayTrack([]);
              }}
              replayMode={replayMode}
              setReplayMode={setReplayMode}
              replayTrack={replayTrack}
              setReplayTrack={setReplayTrack}
              replayIndex={replayIndex}
              setReplayIndex={setReplayIndex}
              isReplayPlaying={isReplayPlaying}
              setIsReplayPlaying={setIsReplayPlaying}
            />
          )}
        </>
      ) : (
        <SarDashboard vessels={Object.values(vessels)} />
      )}
    </div>
  );
}

export default App;
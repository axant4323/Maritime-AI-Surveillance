import React, { useState, useEffect } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const mapStyle = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '&copy; CartoDB'
    }
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

function SarMap({ vessels = [], sarDetections = [] }) {
  const [viewState, setViewState] = useState({
    longitude: -94.8,
    latitude: 29.3,
    zoom: 8
  });
  const [popupInfo, setPopupInfo] = useState(null);

  useEffect(() => {
    if (sarDetections && sarDetections.length > 0) {
      setViewState(prev => ({
        ...prev,
        longitude: sarDetections[0].lon,
        latitude: sarDetections[0].lat,
        zoom: 9
      }));
    }
  }, [sarDetections]);

  return (
    <div className="sar-map-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle={mapStyle}
        onClick={() => setPopupInfo(null)}
      >
        <NavigationControl position="top-left" />

        {/* Render AIS Vessels as circles */}
        {vessels.map(v => (
          <Marker 
            key={v.mmsi} 
            longitude={v.lon} 
            latitude={v.lat} 
            anchor="center"
          >
            <div 
              style={{
                width: 8,
                height: 8,
                backgroundColor: "var(--accent-color)",
                borderRadius: "50%",
                opacity: 0.8,
                cursor: "pointer",
                boxShadow: "0 0 4px var(--accent-color)"
              }}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setPopupInfo({ type: 'ais', data: v });
              }}
            />
          </Marker>
        ))}

        {/* Render SAR Detections as square markers */}
        {sarDetections.map((d, idx) => {
          let color = "var(--normal)"; // Matched
          if (d.isDarkVessel) {
            color = d.voiLevel === "Critical" ? "var(--critical)" : "var(--high-risk)"; // Red or Orange
          }

          return (
            <Marker
              key={`sar-${idx}`}
              longitude={d.lon}
              latitude={d.lat}
              anchor="center"
            >
              <div 
                style={{
                  width: 16, 
                  height: 16, 
                  backgroundColor: color, 
                  border: "2px solid white", 
                  boxShadow: `0 0 8px ${color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setPopupInfo({ type: 'sar', data: d });
                }}
              >
                {d.isDarkVessel && d.voiLevel === "Critical" && (
                  <div style={{ width: 4, height: 4, background: "white", borderRadius: "50%", animation: "pulse 1s infinite" }}></div>
                )}
              </div>
            </Marker>
          );
        })}

        {popupInfo && popupInfo.type === 'ais' && (
          <Popup
            longitude={popupInfo.data.lon}
            latitude={popupInfo.data.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div style={{ fontSize: "0.8rem", color: "#333", padding: '4px' }}>
              <strong>AIS Vessel</strong><br/>
              MMSI: {popupInfo.data.mmsi}<br/>
              Speed: {popupInfo.data.speed} kn
            </div>
          </Popup>
        )}

        {popupInfo && popupInfo.type === 'sar' && (
          <Popup
            longitude={popupInfo.data.lon}
            latitude={popupInfo.data.lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeOnClick={false}
          >
            <div style={{ fontSize: "0.85rem", color: "#333", minWidth: "150px", padding: '4px' }}>
              <strong style={{ color: popupInfo.data.isDarkVessel ? "var(--critical)" : "var(--normal)" }}>
                {popupInfo.data.isDarkVessel ? "DARK VESSEL DETECTED" : "MATCHED VESSEL"}
              </strong><br/>
              Lat: {popupInfo.data.lat.toFixed(4)}<br/>
              Lon: {popupInfo.data.lon.toFixed(4)}<br/>
              Confidence: {(popupInfo.data.confidence * 100).toFixed(1)}%<br/>
              Nearest AIS: {popupInfo.data.nearestAisMmsi || "None"}<br/>
              {popupInfo.data.distanceToAisKm && <span>Dist to AIS: {popupInfo.data.distanceToAisKm.toFixed(2)} km<br/></span>}
              Threat Score: <strong>{popupInfo.data.threatScore}%</strong>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

export default SarMap;

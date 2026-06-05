import React, { useEffect, useState, useMemo, useCallback } from "react";
import Map, { Marker, Popup, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Shield, Layers, Flame } from "lucide-react";

// Geofence data
const GEOFENCES = [
  { name: "Houston Port", lat: 29.76, lon: -95.36, radius: 15000, color: "var(--voi)", hex: "#f59e0b" },
  { name: "Galveston Port", lat: 29.30, lon: -94.79, radius: 15000, color: "var(--critical)", hex: "#ef4444" },
  { name: "Miami Port", lat: 25.77, lon: -80.19, radius: 15000, color: "var(--monitor)", hex: "#3b82f6" },
  { name: "Seattle Port", lat: 47.60, lon: -122.33, radius: 20000, color: "var(--normal)", hex: "#10b981" }
];

const getThreatColor = (score) => {
  if (score < 20) return "var(--normal)";
  if (score < 40) return "var(--monitor)";
  if (score < 60) return "var(--voi)";
  if (score < 80) return "var(--high-risk)";
  return "var(--critical)";
};

const getThreatColorHex = (score) => {
  if (score < 20) return "#10b981";
  if (score < 40) return "#3b82f6";
  if (score < 60) return "#f59e0b";
  if (score < 80) return "#f97316";
  return "#ef4444";
};

// Helper to draw circles as GeoJSON polygons
function createGeoJSONCircle(center, radiusInMeters, points = 64) {
    const coords = { latitude: center[0], longitude: center[1] };
    const km = radiusInMeters / 1000;
    const ret = [];
    const distanceX = km / (111.320 * Math.cos(coords.latitude * Math.PI / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        ret.push([coords.longitude + x, coords.latitude + y]);
    }
    ret.push(ret[0]); // close the polygon
    return [ret];
}

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

function VesselMap({
  vessels = [],
  selectedVessel = null,
  onSelectVessel = () => {},
  replayMode = false,
  replayTrack = [],
  replayIndex = 0,
}) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showClustering, setShowClustering] = useState(false);
  const [viewState, setViewState] = useState({
    longitude: -90.0,
    latitude: 28.0,
    zoom: 5
  });
  const [popupInfo, setPopupInfo] = useState(null);

  useEffect(() => {
    if (replayMode && replayTrack && replayTrack.length > 0) {
      const activePoint = replayTrack[replayIndex];
      if (activePoint) {
        setViewState(prev => ({
          ...prev,
          longitude: activePoint.lon,
          latitude: activePoint.lat
        }));
      }
    } else if (selectedVessel) {
      setViewState(prev => ({
        ...prev,
        longitude: selectedVessel.lon,
        latitude: selectedVessel.lat,
        zoom: Math.max(prev.zoom, 8)
      }));
    }
  }, [selectedVessel, replayMode, replayTrack, replayIndex]);

  const vesselGeoJSON = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: vessels.map(v => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [v.lon, v.lat] },
        properties: {
          mmsi: v.mmsi,
          name: v.name,
          threatScore: v.threatScore,
          voiLevel: v.voiLevel,
          speed: v.speed,
          heading: v.heading,
          color: getThreatColorHex(v.threatScore)
        }
      }))
    };
  }, [vessels]);

  const geofenceGeoJSON = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: GEOFENCES.map(zone => ({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: createGeoJSONCircle([zone.lat, zone.lon], zone.radius)
        },
        properties: {
          name: zone.name,
          color: zone.hex,
          radius: zone.radius
        }
      }))
    };
  }, []);

  const trailGeoJSON = useMemo(() => {
    if (replayMode && replayTrack.length > 0) {
      const activeCoords = replayTrack.slice(0, replayIndex + 1).map(p => [p.lon, p.lat]);
      const dottedCoords = replayTrack.slice(replayIndex).map(p => [p.lon, p.lat]);
      return {
        active: { type: "Feature", geometry: { type: "LineString", coordinates: activeCoords } },
        dotted: { type: "Feature", geometry: { type: "LineString", coordinates: dottedCoords } }
      };
    } else if (selectedVessel && replayTrack && replayTrack.length > 0) {
      const coords = replayTrack.map(p => [p.lon, p.lat]);
      return {
        active: { type: "Feature", geometry: { type: "LineString", coordinates: coords } },
        dotted: null
      };
    }
    return null;
  }, [replayMode, replayTrack, replayIndex, selectedVessel]);

  // Determine which vessels to render as markers
  const renderedMarkers = useMemo(() => {
    if (showClustering) {
      // If clustering is managed by MapLibre Source, we won't render React Markers for vessels.
      // But we need to handle selected vessel explicitly if we want it to always show.
      // For now, we will rely on maplibre layers for unclustered points if clustering is ON.
      return null;
    }
    
    if (replayMode && replayTrack.length > 0) {
      const activePoint = replayTrack[replayIndex];
      if (!activePoint) return null;
      
      const simulatedVessel = {
        ...selectedVessel,
        lat: activePoint.lat,
        lon: activePoint.lon,
        speed: activePoint.speed,
        heading: activePoint.heading
      };
      
      const color = getThreatColor(simulatedVessel.threatScore);
      return (
        <Marker longitude={simulatedVessel.lon} latitude={simulatedVessel.lat} anchor="center">
          <div 
            style={{ position: 'relative', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={(e) => { e.originalEvent.stopPropagation(); setPopupInfo(simulatedVessel); }}
          >
            <div className="pulse-ring" style={{ '--pulse-color': color }}></div>
            <svg style={{ transform: `rotate(${simulatedVessel.heading || 0}deg)`, color }} viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
            </svg>
          </div>
        </Marker>
      );
    }

    return vessels.map(v => {
      const isSelected = selectedVessel && selectedVessel.mmsi === v.mmsi;
      const color = getThreatColor(v.threatScore);
      return (
        <Marker key={v.mmsi} longitude={v.lon} latitude={v.lat} anchor="center" style={{ zIndex: isSelected ? 100 : 1 }}>
          <div 
            style={{ position: 'relative', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onSelectVessel(v);
              setPopupInfo(v);
            }}
          >
            {isSelected && <div className="pulse-ring" style={{ '--pulse-color': color }}></div>}
            <svg style={{ transform: `rotate(${v.heading || 0}deg)`, color }} viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
            </svg>
          </div>
        </Marker>
      );
    });
  }, [vessels, selectedVessel, showClustering, replayMode, replayTrack, replayIndex, onSelectVessel]);

  const handleMapClick = (event) => {
    if (showClustering && event.features && event.features.length > 0) {
      const feature = event.features[0];
      if (feature.layer.id === 'unclustered-point') {
        const v = vessels.find(v => v.mmsi === feature.properties.mmsi);
        if (v) {
          onSelectVessel(v);
          setPopupInfo(v);
        }
      }
    } else {
      setPopupInfo(null);
    }
  };

  return (
    <div className="map-container-area" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div className="map-overlay-controls" style={{ position: 'absolute', top: 10, right: 50, zIndex: 10 }}>
        <button 
          className={`overlay-btn ${showHeatmap ? "active" : ""}`}
          onClick={() => setShowHeatmap(!showHeatmap)}
        >
          <Flame size={14} /> Heatmap Layer
        </button>
        <button 
          className={`overlay-btn ${showClustering ? "active" : ""}`}
          onClick={() => setShowClustering(!showClustering)}
        >
          <Layers size={14} /> Marker Cluster
        </button>
      </div>

      <div className="map-wrapper" style={{ width: '100%', height: '100%' }}>
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapStyle={mapStyle}
          interactiveLayerIds={showClustering ? ['unclustered-point', 'clusters'] : []}
          onClick={handleMapClick}
        >
          <NavigationControl position="top-left" />

          {/* Geofences Layer */}
          <Source id="geofences" type="geojson" data={geofenceGeoJSON}>
            <Layer 
              id="geofence-fill" 
              type="fill" 
              paint={{
                'fill-color': ['get', 'color'],
                'fill-opacity': 0.08
              }}
            />
            <Layer 
              id="geofence-outline" 
              type="line" 
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 1.5,
                'line-dasharray': [5, 5]
              }}
            />
          </Source>

          {/* Trail Layers */}
          {trailGeoJSON && trailGeoJSON.active && (
            <Source id="trail-active" type="geojson" data={trailGeoJSON.active}>
              <Layer 
                id="trail-active-line"
                type="line"
                paint={{
                  'line-color': getThreatColorHex(selectedVessel?.threatScore || 0),
                  'line-width': 3,
                  'line-opacity': 0.9
                }}
              />
            </Source>
          )}
          {trailGeoJSON && trailGeoJSON.dotted && (
            <Source id="trail-dotted" type="geojson" data={trailGeoJSON.dotted}>
              <Layer 
                id="trail-dotted-line"
                type="line"
                paint={{
                  'line-color': getThreatColorHex(selectedVessel?.threatScore || 0),
                  'line-width': 2,
                  'line-opacity': 0.4,
                  'line-dasharray': [3, 3]
                }}
              />
            </Source>
          )}

          {/* Vessel Source for Heatmap and Clustering */}
          <Source 
            id="vessels" 
            type="geojson" 
            data={vesselGeoJSON}
            cluster={showClustering}
            clusterMaxZoom={14}
            clusterRadius={50}
          >
            {/* Heatmap Layer */}
            {showHeatmap && (
              <Layer
                id="vessels-heatmap"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['interpolate', ['linear'], ['get', 'threatScore'], 0, 0, 100, 1],
                  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
                  'heatmap-color': [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0, 'rgba(33,102,172,0)',
                    0.2, 'rgb(103,169,207)',
                    0.4, 'rgb(209,229,240)',
                    0.6, 'rgb(253,219,199)',
                    0.8, 'rgb(239,138,98)',
                    1, 'rgb(178,24,43)'
                  ],
                  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
                  'heatmap-opacity': 0.8
                }}
              />
            )}

            {/* Clustered points */}
            {showClustering && (
              <>
                <Layer
                  id="clusters"
                  type="circle"
                  filter={['has', 'point_count']}
                  paint={{
                    'circle-color': [
                      'step',
                      ['get', 'point_count'],
                      '#10b981', // green for small
                      10,
                      '#f59e0b', // yellow for medium
                      30,
                      '#ef4444'  // red for large
                    ],
                    'circle-radius': [
                      'step',
                      ['get', 'point_count'],
                      15,
                      10,
                      20,
                      30,
                      25
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#fff'
                  }}
                />
                <Layer
                  id="cluster-count"
                  type="symbol"
                  filter={['has', 'point_count']}
                  layout={{
                    'text-field': '{point_count_abbreviated}',
                    'text-size': 12
                  }}
                  paint={{
                    'text-color': '#ffffff'
                  }}
                />
                <Layer
                  id="unclustered-point"
                  type="circle"
                  filter={['!', ['has', 'point_count']]}
                  paint={{
                    'circle-color': ['get', 'color'],
                    'circle-radius': 6,
                    'circle-stroke-width': 1,
                    'circle-stroke-color': '#fff'
                  }}
                />
              </>
            )}
          </Source>

          {renderedMarkers}

          {popupInfo && (
            <Popup
              longitude={popupInfo.lon}
              latitude={popupInfo.lat}
              anchor="bottom"
              onClose={() => setPopupInfo(null)}
              closeOnClick={false}
            >
              <div style={{ fontSize: "0.85rem", minWidth: "160px", color: "#333", padding: '5px' }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <strong>{popupInfo.name || "Unknown Target"}</strong>
                  <span style={{ 
                    fontSize: "0.7rem", 
                    padding: "1px 5px", 
                    backgroundColor: `${getThreatColor(popupInfo.threatScore)}25`, 
                    color: getThreatColor(popupInfo.threatScore),
                    borderRadius: "3px",
                    border: `1px solid ${getThreatColor(popupInfo.threatScore)}50`,
                    fontWeight: "bold"
                  }}>
                    {popupInfo.threatScore}%
                  </span>
                </div>
                MMSI: {popupInfo.mmsi}<br/>
                Speed: {popupInfo.speed?.toFixed(1) || "0.0"} kn<br/>
                Heading: {popupInfo.heading || "0"}°<br/>
                Lat: {popupInfo.lat?.toFixed(4)}, Lon: {popupInfo.lon?.toFixed(4)}<br/>
                VOI Level: <strong style={{ color: getThreatColor(popupInfo.threatScore) }}>{popupInfo.voiLevel}</strong>
              </div>
            </Popup>
          )}

        </Map>
      </div>
    </div>
  );
}

export default VesselMap;
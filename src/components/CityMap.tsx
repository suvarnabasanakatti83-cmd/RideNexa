import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Coordinates,
  DemandZoneForecast,
  DriverRecord,
  RepositionRecommendation,
} from '../types/ridenexa';

export interface RouteOverlay {
  waypoints: [number, number][];
  color?: string;
  weight?: number;
  dashArray?: string;
  label?: string;
}

interface CityMapProps {
  center?: Coordinates;
  zoom?: number;
  heightClass?: string;
  drivers?: DriverRecord[];
  selectedDriverId?: string;
  pickup?: { coordinates: Coordinates; label: string } | null;
  destination?: { coordinates: Coordinates; label: string } | null;
  routes?: RouteOverlay[];
  heatmapZones?: DemandZoneForecast[];
  repositionVectors?: RepositionRecommendation[];
  onMapClick?: (coords: Coordinates) => void;
  fitToOverlays?: boolean;
}

export const CityMap: React.FC<CityMapProps> = ({
  center = { lat: 12.9716, lng: 77.6146 },
  zoom = 12,
  heightClass = 'h-[420px]',
  drivers = [],
  selectedDriverId,
  pickup,
  destination,
  routes = [],
  heatmapZones = [],
  repositionVectors = [],
  onMapClick,
  fitToOverlays = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current({
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5)),
        });
      }
    });

    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const boundsPoints: L.LatLngExpression[] = [];

    // 1. Demand Heatmap Circles
    heatmapZones.forEach((zone) => {
      const color =
        zone.intensity === 'CRITICAL'
          ? '#DC2626'
          : zone.intensity === 'HIGH'
          ? '#D97706'
          : zone.intensity === 'MODERATE'
          ? '#009F95'
          : '#64748B';
      const radius = 550 + zone.predictedDemand * 22;

      const circle = L.circle([zone.coordinates.lat, zone.coordinates.lng], {
        radius,
        color,
        weight: 1.5,
        fillColor: color,
        fillOpacity: zone.intensity === 'CRITICAL' ? 0.28 : 0.18,
      });

      circle.bindPopup(
        `<div style="min-width:190px">
          <div style="font-weight:700;color:#0B1220;margin-bottom:4px">${zone.zoneName}</div>
          <div>Predicted demand: <strong>${zone.predictedDemand} req/hr</strong></div>
          <div>Nearby drivers: <strong>${zone.activeDrivers}</strong> · Supply gap: <strong>${zone.supplyGap}</strong></div>
          <div>Pressure: <strong>${zone.intensity}</strong> (${zone.surgeMultiplier}x)</div>
        </div>`
      );
      circle.addTo(group);
      boundsPoints.push([zone.coordinates.lat, zone.coordinates.lng]);
    });

    // 2. Route Polylines
    routes.forEach((route) => {
      if (route.waypoints.length < 2) return;
      const line = L.polyline(route.waypoints, {
        color: route.color || '#009F95',
        weight: route.weight || 4,
        opacity: 0.9,
        dashArray: route.dashArray,
      });
      if (route.label) {
        line.bindPopup(`<strong>${route.label}</strong>`);
      }
      line.addTo(group);
      route.waypoints.forEach((pt) => boundsPoints.push(pt));
    });

    // 3. Reposition Vectors
    repositionVectors.forEach((rec) => {
      const arrowLine = L.polyline(
        [
          [rec.currentCoords.lat, rec.currentCoords.lng],
          [rec.targetCoords.lat, rec.targetCoords.lng],
        ],
        {
          color: '#0B1220',
          weight: 2.5,
          dashArray: '6, 6',
          opacity: 0.85,
        }
      );
      arrowLine.bindPopup(
        `<div>
          <strong>Reposition: ${rec.driverName}</strong><br/>
          ${rec.currentArea} → ${rec.targetZoneName}<br/>
          Distance: ${rec.travelDistanceKm} km (${rec.travelMinutes} min)
        </div>`
      );
      arrowLine.addTo(group);

      const targetDot = L.circleMarker([rec.targetCoords.lat, rec.targetCoords.lng], {
        radius: 8,
        color: '#009F95',
        fillColor: '#009F95',
        fillOpacity: 0.9,
        weight: 2,
      });
      targetDot.bindPopup(
        `<strong>Target Hotspot: ${rec.targetZoneName}</strong><br/>Expected demand: ${rec.expectedDemand} req/hr`
      );
      targetDot.addTo(group);
    });

    // 4. Drivers
    drivers.forEach((drv) => {
      const isSelected = selectedDriverId === drv.id;
      const fill = !drv.isOnline
        ? '#94A3B8'
        : isSelected
        ? '#009F95'
        : drv.isAvailable
        ? '#0B1220'
        : '#D97706';

      const icon = L.divIcon({
        className: 'ridenexa-driver-marker',
        html: `<div style="
          width:${isSelected ? 32 : 26}px;
          height:${isSelected ? 32 : 26}px;
          border-radius:8px;
          background:${fill};
          border:2px solid #FFFFFF;
          box-shadow:0 3px 10px rgba(11,18,32,0.3);
          display:flex;
          align-items:center;
          justify-content:center;
          color:#FFFFFF;
          font-size:11px;
          font-weight:700;
          font-family:'JetBrains Mono',monospace;
        ">${isSelected ? '★' : 'RN'}</div>`,
        iconSize: [isSelected ? 32 : 26, isSelected ? 32 : 26],
        iconAnchor: [isSelected ? 16 : 13, isSelected ? 16 : 13],
      });

      const marker = L.marker([drv.coordinates.lat, drv.coordinates.lng], { icon });
      marker.bindPopup(
        `<div style="min-width:190px">
          <div style="font-weight:700;color:#0B1220">${drv.name}${isSelected ? ' (Selected)' : ''}</div>
          <div style="color:#475569;font-size:12px">${drv.vehicleModel} · ${drv.plateNumber}</div>
          <div style="margin-top:6px;font-size:12px">
            Status: <strong>${!drv.isOnline ? 'Offline' : drv.isAvailable ? 'Available' : 'On Trip'}</strong><br/>
            Trips today: <strong>${drv.ridesCompletedToday}</strong> · Rating: <strong>${drv.rating.toFixed(2)}</strong><br/>
            Source: <span>${drv.isSimulatedLocation ? 'Simulated Demo Fleet' : 'Driver GPS'}</span>
          </div>
        </div>`
      );
      marker.addTo(group);
      boundsPoints.push([drv.coordinates.lat, drv.coordinates.lng]);
    });

    // 5. Pickup & Destination Pins
    if (pickup) {
      const pickupIcon = L.divIcon({
        className: 'ridenexa-pin',
        html: `<div style="width:20px;height:20px;border-radius:9999px;background:#009F95;border:3px solid #FFFFFF;box-shadow:0 3px 10px rgba(0,159,149,0.45);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([pickup.coordinates.lat, pickup.coordinates.lng], { icon: pickupIcon })
        .bindPopup(`<strong>Pickup</strong><br/>${pickup.label}`)
        .addTo(group);
      boundsPoints.push([pickup.coordinates.lat, pickup.coordinates.lng]);
    }

    if (destination) {
      const destIcon = L.divIcon({
        className: 'ridenexa-pin',
        html: `<div style="width:20px;height:20px;border-radius:4px;background:#0B1220;border:3px solid #FFFFFF;box-shadow:0 3px 10px rgba(11,18,32,0.45);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      L.marker([destination.coordinates.lat, destination.coordinates.lng], { icon: destIcon })
        .bindPopup(`<strong>Destination</strong><br/>${destination.label}`)
        .addTo(group);
      boundsPoints.push([destination.coordinates.lat, destination.coordinates.lng]);
    }

    if (fitToOverlays && boundsPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [36, 36], maxZoom: 14 });
    }
  }, [drivers, selectedDriverId, pickup, destination, routes, heatmapZones, repositionVectors, fitToOverlays]);

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${heightClass}`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
};

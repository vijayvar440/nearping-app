import React, { useEffect } from "react";
import { useMap, Circle, Marker } from "react-leaflet";
import L from "leaflet";

export default function RadarFocusMap({ center, radiusKm }) {
  const map = useMap();

  useEffect(() => {
    if (center?.lat && center?.lng && radiusKm) {
      const radiusInMeters = Number(radiusKm) * 1000;
      
      // Calculate bounding box around the center point based on radius
      const circleBounds = L.latLng(center.lat, center.lng).toBounds(radiusInMeters);
      
      // Map ko automatically zoom aur center kar do radius ke hisab se
      map.fitBounds(circleBounds, { padding: [30, 30] });
    }
  }, [center, radiusKm, map]);

  if (!center?.lat || !center?.lng) return null;

  return (
    <>
      {/* 📍 Incident Spot Pin */}
      <Marker position={[center.lat, center.lng]} />

      {/* 📡 Radar Boundary Circle */}
      <Circle
        center={[center.lat, center.lng]}
        radius={Number(radiusKm) * 1000} // meters mein conversion
        pathOptions={{
          color: "#dc2626",        // Red border
          fillColor: "#ef4444",    // Light red fill
          fillOpacity: 0.15,       // Translucent radar look
          dashArray: "6, 6",       // Dotted radar boundary
          weight: 2
        }}
      />
    </>
  );
}
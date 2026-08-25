import React, { useContext } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LocationContext } from "../context/LocationContext";
import "leaflet/dist/leaflet.css";

const MapView = ({ pings }) => {
  const { coords } = useContext(LocationContext);

  if (!coords) return <div className="p-4 text-center font-medium text-gray-600">Fetching live location...</div>;

  return (
    <div className="h-[80vh] w-full rounded-xl overflow-hidden shadow-md">
      <MapContainer center={[coords.lat, coords.lng]} zoom={15} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* User ka Live Marker */}
        <Marker position={[coords.lat, coords.lng]}>
          <Popup>📍 Aap Yahan Ho</Popup>
        </Marker>

        {/* Nearby Pings ke Markers */}
        {pings?.map((ping) => (
          <Marker 
            key={ping._id} 
            position={[ping.location.coordinates[1], ping.location.coordinates[0]]}
          >
            <Popup>
              <div className="p-1">
                <span className="font-bold text-red-500">[{ping.type}]</span>
                <h3 className="font-semibold">{ping.title}</h3>
                <p className="text-sm">{ping.description}</p>
                <small className="text-gray-500">Near: {ping.landmark}</small>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
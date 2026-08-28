import React, { createContext, useState, useEffect } from "react";

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      console.warn("⚠️ Geolocation not supported. Using fallback.");
      setCoords({ lat: 28.6139, lng: 77.2090 });
      return;
    }

    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn("⚠️ GPS Error/Denied. Using Fallback Coords.");
        setCoords((prev) => prev || { lat: 28.6139, lng: 77.2090 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    // Cleanup watch on unmount
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return (
    <LocationContext.Provider value={{ coords, setCoords }}>
      {children}
    </LocationContext.Provider>
  );
};
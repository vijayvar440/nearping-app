import React, { createContext, useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    let watchId = null;

    const startLocation = async () => {
      try {
        // 📱 Android / iOS Capacitor app
        if (Capacitor.isNativePlatform()) {
          // 🔐 Check current permission
          let permissions = await Geolocation.checkPermissions();

          // Ask permission if not granted
          if (
            permissions.location !== "granted" &&
            permissions.location !== "whileInUse"
          ) {
            permissions = await Geolocation.requestPermissions();
          }

          if (
            permissions.location !== "granted" &&
            permissions.location !== "whileInUse"
          ) {
            console.warn("⚠️ Location permission denied.");
            return;
          }

          // 📍 Get current location immediately
          const current = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });

          setCoords({
            lat: current.coords.latitude,
            lng: current.coords.longitude,
          });

          // 🔄 Keep location updated
          watchId = await Geolocation.watchPosition(
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            },
            (position, error) => {
              if (error) {
                console.warn("⚠️ Location watch error:", error);
                return;
              }

              if (position) {
                setCoords({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
              }
            }
          );

          return;
        }

        // 🌐 Normal browser version
        if (!("geolocation" in navigator)) {
          console.warn("⚠️ Geolocation not supported.");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            setCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.warn("⚠️ Browser GPS Error:", error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setCoords({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (error) => {
            console.warn("⚠️ Browser GPS Watch Error:", error.message);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      } catch (error) {
        console.error("❌ Location setup error:", error);
      }
    };

    startLocation();

    return () => {
      if (watchId !== null) {
        if (Capacitor.isNativePlatform()) {
          Geolocation.clearWatch({ id: watchId }).catch(() => {});
        } else {
          navigator.geolocation.clearWatch(watchId);
        }
      }
    };
  }, []);

  return (
    <LocationContext.Provider value={{ coords, setCoords }}>
      {children}
    </LocationContext.Provider>
  );
};
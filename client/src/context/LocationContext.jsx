import React, { createContext, useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [coords, setCoords] = useState(null);

  // 📍 Get current location manually
  const getCurrentLocation = async () => {
    try {
      // 📱 Android / iOS
      if (Capacitor.isNativePlatform()) {
        let permissions = await Geolocation.checkPermissions();

        if (permissions.location !== "granted") {
          permissions = await Geolocation.requestPermissions();
        }

        if (permissions.location !== "granted") {
          console.warn("⚠️ Location permission denied");
          return null;
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });

        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCoords(newCoords);

        return newCoords;
      }

      // 🌐 Browser
      if (!navigator.geolocation) {
        console.warn("⚠️ Geolocation not supported");
        return null;
      }

      return await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newCoords = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            setCoords(newCoords);
            resolve(newCoords);
          },
          (error) => {
            console.warn("⚠️ Browser GPS Error:", error.message);
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );
      });
    } catch (error) {
      console.error("❌ Get location error:", error);
      return null;
    }
  };

  // 🔄 Start location tracking
  useEffect(() => {
    let watchId = null;

    const startLocation = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          let permissions = await Geolocation.checkPermissions();

          if (permissions.location !== "granted") {
            permissions = await Geolocation.requestPermissions();
          }

          if (permissions.location !== "granted") {
            console.warn("⚠️ Location permission denied");
            return;
          }

          const current = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });

          setCoords({
            lat: current.coords.latitude,
            lng: current.coords.longitude,
          });

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

        // 🌐 Browser
        if (!navigator.geolocation) return;

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
    <LocationContext.Provider
      value={{
        coords,
        setCoords,
        getCurrentLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
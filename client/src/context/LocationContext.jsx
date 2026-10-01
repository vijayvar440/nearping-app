import React, {
  createContext,
  useState,
  useRef,
} from "react";

import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [coords, setCoords] = useState(null);

  // GPS watch ID
  const watchIdRef = useRef(null);

  // ==========================================
  // 📍 GET CURRENT LOCATION
  // ==========================================

  const getCurrentLocation = async () => {
    try {
      // ========================================
      // 📱 ANDROID / IOS
      // ========================================

      if (Capacitor.isNativePlatform()) {
        let permissions =
          await Geolocation.checkPermissions();

        if (
          permissions.location !== "granted"
        ) {
          permissions =
            await Geolocation.requestPermissions();
        }

        if (
          permissions.location !== "granted"
        ) {
          console.warn(
            "⚠️ Location permission denied."
          );

          return null;
        }

        const position =
          await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });

        const newCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setCoords(newCoords);

        console.log(
          "📍 Current location:",
          newCoords
        );

        return newCoords;
      }

      // ========================================
      // 🌐 BROWSER
      // ========================================

      if (!navigator.geolocation) {
        console.warn(
          "⚠️ Geolocation is not supported."
        );

        return null;
      }

      return await new Promise(
        (resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const newCoords = {
                lat:
                  position.coords.latitude,
                lng:
                  position.coords.longitude,
              };

              setCoords(newCoords);

              console.log(
                "📍 Current location:",
                newCoords
              );

              resolve(newCoords);
            },

            (error) => {
              console.warn(
                "⚠️ Browser GPS Error:",
                error.message
              );

              resolve(null);
            },

            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        }
      );
    } catch (error) {
      console.error(
        "❌ Get location error:",
        error
      );

      return null;
    }
  };

  // ==========================================
  // ▶️ START LOCATION TRACKING
  // ==========================================

  const startLocationTracking = async () => {
    try {
      // Already tracking
      if (watchIdRef.current !== null) {
        console.log(
          "📍 Location tracking already running."
        );

        return;
      }

      // ========================================
      // 📱 ANDROID / IOS
      // ========================================

      if (Capacitor.isNativePlatform()) {
        let permissions =
          await Geolocation.checkPermissions();

        if (
          permissions.location !== "granted"
        ) {
          permissions =
            await Geolocation.requestPermissions();
        }

        if (
          permissions.location !== "granted"
        ) {
          console.warn(
            "⚠️ Location permission denied."
          );

          return;
        }

        // Get initial location
        const current =
          await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });

        setCoords({
          lat:
            current.coords.latitude,
          lng:
            current.coords.longitude,
        });

        console.log(
          "📍 GPS tracking started."
        );

        // Start watching
        const watchId =
          await Geolocation.watchPosition(
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            },

            (position, error) => {
              if (error) {
                console.warn(
                  "⚠️ Location watch error:",
                  error
                );

                return;
              }

              if (position) {
                const newCoords = {
                  lat:
                    position.coords.latitude,
                  lng:
                    position.coords.longitude,
                };

                setCoords(newCoords);

                console.log(
                  "📍 Location updated:",
                  newCoords
                );
              }
            }
          );

        watchIdRef.current = watchId;

        return;
      }

      // ========================================
      // 🌐 BROWSER
      // ========================================

      if (!navigator.geolocation) {
        console.warn(
          "⚠️ Geolocation is not supported."
        );

        return;
      }

      // Initial location
      await getCurrentLocation();

      // Start browser tracking
      const browserWatchId =
        navigator.geolocation.watchPosition(
          (position) => {
            const newCoords = {
              lat:
                position.coords.latitude,
              lng:
                position.coords.longitude,
            };

            setCoords(newCoords);

            console.log(
              "📍 Location updated:",
              newCoords
            );
          },

          (error) => {
            console.warn(
              "⚠️ Browser GPS Watch Error:",
              error.message
            );
          },

          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          }
        );

      watchIdRef.current =
        browserWatchId;

      console.log(
        "📍 Browser GPS tracking started."
      );
    } catch (error) {
      console.error(
        "❌ Location tracking error:",
        error
      );
    }
  };

  // ==========================================
  // ⛔ STOP LOCATION TRACKING
  // ==========================================

  const stopLocationTracking = async () => {
    try {
      const watchId =
        watchIdRef.current;

      if (watchId === null) {
        setCoords(null);
        return;
      }

      // 📱 Android / IOS
      if (Capacitor.isNativePlatform()) {
        await Geolocation.clearWatch({
          id: watchId,
        });
      }

      // 🌐 Browser
      else if (navigator.geolocation) {
        navigator.geolocation.clearWatch(
          watchId
        );
      }

      watchIdRef.current = null;

      // Remove old location
      setCoords(null);

      console.log(
        "⛔ GPS tracking stopped."
      );
    } catch (error) {
      console.error(
        "❌ Stop location error:",
        error
      );

      watchIdRef.current = null;
      setCoords(null);
    }
  };

  // ==========================================
  // CONTEXT
  // ==========================================

  return (
    <LocationContext.Provider
      value={{
        coords,
        setCoords,

        // Manual location
        getCurrentLocation,

        // Login ke baad
        startLocationTracking,

        // Logout ke baad
        stopLocationTracking,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
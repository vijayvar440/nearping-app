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

  const watchIdRef = useRef(null);

  // ==========================================
  // 📍 SAVE LOCATION
  // ==========================================

  const updateLocation = (position) => {
    if (!position?.coords) {
      return;
    }

    const {
      latitude,
      longitude,
      accuracy,
    } = position.coords;

    const lat = Number(latitude);
    const lng = Number(longitude);
    const acc = Number(accuracy);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      console.warn(
        "⚠️ Invalid GPS coordinates:",
        position
      );

      return;
    }

    const newCoords = {
      lat,
      lng,
      accuracy: Number.isFinite(acc)
        ? acc
        : null,
    };

    setCoords(newCoords);

    console.log(
      "📍 GPS Location:",
      newCoords
    );
  };

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

        console.log(
          "📡 Getting high accuracy GPS..."
        );

        const position =
          await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,

            // GPS ko thoda extra time
            timeout: 30000,

            // Cached location use nahi karenge
            maximumAge: 0,
          });

        updateLocation(position);

        return {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy:
            position.coords.accuracy ?? null,
        };
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
              updateLocation(position);

              resolve({
                lat:
                  position.coords.latitude,
                lng:
                  position.coords.longitude,
                accuracy:
                  position.coords
                    .accuracy ?? null,
              });
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
              timeout: 30000,
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

  const startLocationTracking =
    async () => {
      try {
        // Already tracking
        if (
          watchIdRef.current !== null
        ) {
          console.log(
            "📍 Location tracking already running."
          );

          return;
        }

        // ======================================
        // 📱 ANDROID / IOS
        // ======================================

        if (
          Capacitor.isNativePlatform()
        ) {
          let permissions =
            await Geolocation.checkPermissions();

          if (
            permissions.location !==
            "granted"
          ) {
            permissions =
              await Geolocation.requestPermissions();
          }

          if (
            permissions.location !==
            "granted"
          ) {
            console.warn(
              "⚠️ Location permission denied."
            );

            return;
          }

          console.log(
            "📡 Getting initial high accuracy GPS..."
          );

          // ------------------------------------
          // Initial GPS location
          // ------------------------------------

          try {
            const current =
              await Geolocation.getCurrentPosition(
                {
                  enableHighAccuracy: true,
                  timeout: 30000,
                  maximumAge: 0,
                }
              );

            updateLocation(current);

            console.log(
              "✅ Initial GPS received."
            );
          } catch (error) {
            console.warn(
              "⚠️ Initial GPS failed:",
              error
            );
          }

          // ------------------------------------
          // Start GPS watch
          // ------------------------------------

          const watchId =
            await Geolocation.watchPosition(
              {
                enableHighAccuracy: true,

                timeout: 30000,

                maximumAge: 0,
              },

              (position, error) => {
                if (error) {
                  console.warn(
                    "⚠️ GPS watch error:",
                    error
                  );

                  return;
                }

                if (!position) {
                  return;
                }

                updateLocation(position);
              }
            );

          watchIdRef.current =
            watchId;

          console.log(
            "📍 High accuracy GPS tracking started."
          );

          return;
        }

        // ======================================
        // 🌐 BROWSER
        // ======================================

        if (
          !navigator.geolocation
        ) {
          console.warn(
            "⚠️ Geolocation is not supported."
          );

          return;
        }

        // --------------------------------------
        // Initial browser location
        // --------------------------------------

        await getCurrentLocation();

        // --------------------------------------
        // Browser GPS watch
        // --------------------------------------

        const browserWatchId =
          navigator.geolocation.watchPosition(
            (position) => {
              updateLocation(position);
            },

            (error) => {
              console.warn(
                "⚠️ Browser GPS Watch Error:",
                error.message
              );
            },

            {
              enableHighAccuracy: true,

              timeout: 30000,

              maximumAge: 0,
            }
          );

        watchIdRef.current =
          browserWatchId;

        console.log(
          "📍 Browser high accuracy GPS tracking started."
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

  const stopLocationTracking =
    async () => {
      try {
        const watchId =
          watchIdRef.current;

        if (watchId === null) {
          setCoords(null);

          return;
        }

        // 📱 Android / IOS
        if (
          Capacitor.isNativePlatform()
        ) {
          await Geolocation.clearWatch({
            id: watchId,
          });
        }

        // 🌐 Browser
        else if (
          navigator.geolocation
        ) {
          navigator.geolocation.clearWatch(
            watchId
          );
        }

        watchIdRef.current = null;

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

        getCurrentLocation,

        startLocationTracking,

        stopLocationTracking,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
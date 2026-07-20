import { useState } from "react";

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("idle");

  function requestLocation() {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      setStatus("denied");
      return;
    }

    setStatus("pending");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus("granted");
      },
      (err) => {
        setError(err.message);
        setStatus("denied");
      }
    );
  }

  return { location, error, status, requestLocation };
}
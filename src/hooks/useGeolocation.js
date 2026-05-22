import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [heading, setHeading]   = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada en este dispositivo');
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat:         pos.coords.latitude,
          lon:         pos.coords.longitude,
          alt:         pos.coords.altitude,
          accuracy:    pos.coords.accuracy,
          altAccuracy: pos.coords.altitudeAccuracy,
          heading:     pos.coords.heading,
          speed:       pos.coords.speed,
          timestamp:   pos.timestamp,
        });
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const handleOrientation = (e) => {
      if (e.webkitCompassHeading != null) {
        setHeading(e.webkitCompassHeading);
      } else if (e.alpha != null) {
        setHeading((360 - e.alpha) % 360);
      }
    };

    if (typeof DeviceOrientationEvent !== 'undefined') {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ – permission requested by user gesture via requestCompassPermission()
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }

    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  const requestCompassPermission = async () => {
    if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const perm = await DeviceOrientationEvent.requestPermission();
        if (perm === 'granted') {
          window.addEventListener('deviceorientation', (e) => {
            if (e.webkitCompassHeading != null) setHeading(e.webkitCompassHeading);
            else if (e.alpha != null)           setHeading((360 - e.alpha) % 360);
          }, true);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return { location, error, loading, heading, requestCompassPermission };
}

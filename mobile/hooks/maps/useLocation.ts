import { useRef, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { MapLocation } from '@/types/maps';

const LOCATION_TTL_MS = 15_000;

interface UseLocationResult {
  location: MapLocation | null;
  isLoading: boolean;
  error: string | null;
  getLocation: (opts?: { force?: boolean }) => Promise<MapLocation | null>;
}

export const useLocation = (): UseLocationResult => {
  const [location, setLocation] = useState<MapLocation | null>(null);
  const cacheRef = useRef<{ location: MapLocation; ts: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    const now = Date.now();

    if (!force && cacheRef.current && now - cacheRef.current.ts < LOCATION_TTL_MS) {
      return cacheRef.current.location;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        return null;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newLocation: MapLocation = {
        coordinate: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        },
        displayName: 'Current Location',
      };

      cacheRef.current = { location: newLocation, ts: now };
      setLocation(newLocation);

      return newLocation;
    } catch (e) {
      setError('Failed to get location');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { location, isLoading, error, getLocation };
};

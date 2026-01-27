import { useState, useEffect, RefObject } from 'react';
import { OSMViewRef } from 'expo-osm-sdk';
import { MapLocation } from '@/types/maps';

interface UseMapInitializationProps {
  mapRef: RefObject<OSMViewRef | null>;
  getLocation: () => Promise<MapLocation | null>;
  initialZoom?: number;
}

export const useMapInitialization = ({
  mapRef,
  getLocation,
  initialZoom = 20,
}: UseMapInitializationProps) => {
  const [initialCenter, setInitialCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [startLocation, setStartLocation] = useState<MapLocation | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<MapLocation | null>(null);

  // Initialize map center and start location on mount
  useEffect(() => {
    const init = async () => {
      const userLocation = await getLocation();
      if (userLocation) {
        setInitialCenter(userLocation.coordinate);
        setStartLocation(userLocation);
      }
    };

    init();
  }, [getLocation]);

  // Animate to initial center when map is ready
  useEffect(() => {
    if (isMapReady && initialCenter && mapRef.current) {
      mapRef.current.animateToLocation(
        initialCenter.latitude,
        initialCenter.longitude,
        initialZoom
      );
    }
  }, [isMapReady, initialCenter, mapRef, initialZoom]);

  return {
    initialCenter,
    isMapReady,
    setIsMapReady,
    startLocation,
    setStartLocation,
    destinationLocation,
    setDestinationLocation,
  };
};

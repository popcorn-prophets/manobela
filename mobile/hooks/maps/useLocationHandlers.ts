import { useState, useCallback, RefObject } from 'react';
import { Alert } from 'react-native';
import { OSMViewRef } from 'expo-osm-sdk';
import { MapLocation, Coordinate } from '@/types/maps';

interface UseLocationHandlersProps {
  mapRef: RefObject<OSMViewRef | null>;
  startLocation: MapLocation | null;
  setStartLocation: (location: MapLocation | null) => void;
  destinationLocation: MapLocation | null;
  setDestinationLocation: (location: MapLocation | null) => void;
  getLocation: () => Promise<MapLocation | null>;
  calculateRoute: (
    start: Coordinate,
    end: Coordinate,
    mapRef: RefObject<OSMViewRef | null>
  ) => Promise<void>;
  initialZoom?: number;
}

export const useLocationHandlers = ({
  mapRef,
  startLocation,
  setStartLocation,
  destinationLocation,
  setDestinationLocation,
  getLocation,
  calculateRoute,
  initialZoom = 20,
}: UseLocationHandlersProps) => {
  const [isGettingUserLocation, setIsGettingUserLocation] = useState(false);

  const handleStartLocationSelected = useCallback(
    async (location: MapLocation | null) => {
      if (!location) {
        setStartLocation(null);
        return;
      }

      setStartLocation(location);

      mapRef.current?.animateToLocation(
        location.coordinate.latitude,
        location.coordinate.longitude,
        initialZoom
      );

      if (destinationLocation && mapRef.current) {
        await calculateRoute(location.coordinate, destinationLocation.coordinate, mapRef);
      }
    },
    [destinationLocation, calculateRoute, setStartLocation, mapRef, initialZoom]
  );

  const handleDestinationLocationSelected = useCallback(
    async (location: MapLocation | null) => {
      if (!location) {
        setDestinationLocation(null);
        return;
      }

      setDestinationLocation(location);

      mapRef.current?.animateToLocation(
        location.coordinate.latitude,
        location.coordinate.longitude,
        initialZoom
      );

      if (!startLocation) {
        setIsGettingUserLocation(true);
        const userLocation = await getLocation();

        if (userLocation) {
          setStartLocation(userLocation);

          if (mapRef.current) {
            await calculateRoute(userLocation.coordinate, location.coordinate, mapRef);
          }
        }
        setIsGettingUserLocation(false);
      } else {
        if (mapRef.current) {
          await calculateRoute(startLocation.coordinate, location.coordinate, mapRef);
        }
      }
    },
    [
      startLocation,
      getLocation,
      calculateRoute,
      setStartLocation,
      setDestinationLocation,
      mapRef,
      initialZoom,
    ]
  );

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      if (!mapRef.current) {
        Alert.alert('Error', 'Map not ready');
        return;
      }

      setIsGettingUserLocation(true);
      const location = await getLocation();

      if (!location) {
        Alert.alert(
          'Error',
          'Unable to get current location. Please check your location permissions.'
        );
        setIsGettingUserLocation(false);
        return;
      }

      setStartLocation(location);

      mapRef.current?.animateToLocation(
        location.coordinate.latitude,
        location.coordinate.longitude,
        initialZoom
      );

      setIsGettingUserLocation(false);
    } catch (err: any) {
      console.error('Error getting current location:', err);
      Alert.alert('Error', err.message || 'Failed to get current location');
      setIsGettingUserLocation(false);
    }
  }, [getLocation, setStartLocation, mapRef, initialZoom]);

  return {
    isGettingUserLocation,
    handleStartLocationSelected,
    handleDestinationLocationSelected,
    handleUseCurrentLocation,
  };
};

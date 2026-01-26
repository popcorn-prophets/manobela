import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { View, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { OSMView, type OSMViewRef } from 'expo-osm-sdk';
import * as Location from 'expo-location';
import { useRouteCalculation } from './hooks/useRouteCalculation';
import { useLocationPermission } from './hooks/useLocationPermission';
import { RouteControls } from './components/RouteControls';
import { RouteInfo } from './components/RouteInfo';
import { LocationSearchBoxes } from './components/LocationSearchBoxes';

interface MapLocation {
  coordinate: { latitude: number; longitude: number };
  displayName?: string;
}

export default function MapsScreen() {
  const mapRef = useRef<OSMViewRef>(null);
  const [startLocation, setStartLocation] = useState<MapLocation | null>(null);
  const [destinationLocation, setDestinationLocation] = useState<MapLocation | null>(null);

  const {
    route,
    isCalculating,
    error,
    calculateRoute,
    clearRoute,
    formatDistance,
    formatDuration,
  } = useRouteCalculation();

  const { requestPermission, checkPermission } = useLocationPermission();
  const [isGettingUserLocation, setIsGettingUserLocation] = useState(false);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Function to get user's current location
  const getUserLocation = useCallback(async (): Promise<MapLocation | null> => {
    try {
      // Request location permission first
      const hasPermission = await requestPermission();

      if (!hasPermission) {
        return null;
      }

      // Get current location using expo-location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!currentLocation) {
        return null;
      }

      return {
        coordinate: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        },
        displayName: 'Current Location',
      };
    } catch (err: any) {
      console.error('Error getting user location:', err);
      return null;
    }
  }, [requestPermission]);

  // Convert locations to markers array
  const markers = useMemo(() => {
    const markersArray = [];

    if (startLocation) {
      markersArray.push({
        id: 'start-location',
        coordinate: {
          latitude: startLocation.coordinate.latitude,
          longitude: startLocation.coordinate.longitude,
        },
        title: 'Start Location',
        description: startLocation.displayName || 'Current Location',
      });
    }

    if (destinationLocation) {
      markersArray.push({
        id: 'destination-location',
        coordinate: {
          latitude: destinationLocation.coordinate.latitude,
          longitude: destinationLocation.coordinate.longitude,
        },
        title: destinationLocation.displayName || 'Destination',
        description: destinationLocation.displayName || 'Destination Location',
      });
    }

    return markersArray;
  }, [startLocation, destinationLocation]);

  // Handle start location selection from search
  const handleStartLocationSelected = useCallback(
    async (location: MapLocation) => {
      setStartLocation(location);

      // Animate map to selected location
      mapRef.current?.animateToLocation(
        location.coordinate.latitude,
        location.coordinate.longitude,
        15
      );

      // If destination exists, automatically calculate route
      if (destinationLocation && mapRef.current) {
        await calculateRoute(
          location.coordinate,
          destinationLocation.coordinate,
          mapRef
        );
      }
    },
    [destinationLocation, calculateRoute]
  );

  // Handle destination location selection from search
  const handleDestinationLocationSelected = useCallback(
    async (location: MapLocation) => {
      setDestinationLocation(location);

      // Animate map to selected location
      mapRef.current?.animateToLocation(
        location.coordinate.latitude,
        location.coordinate.longitude,
        15
      );

      // If no start location is set, automatically get user's location
      if (!startLocation) {
        setIsGettingUserLocation(true);
        const userLocation = await getUserLocation();

        if (userLocation) {
          setStartLocation(userLocation);

          // Auto-calculate route since both locations are now available
          if (mapRef.current) {
            await calculateRoute(
              userLocation.coordinate,
              location.coordinate,
              mapRef
            );
          }
        }
        setIsGettingUserLocation(false);
      } else {
        // If start location already exists, auto-calculate route
        if (mapRef.current) {
          await calculateRoute(
            startLocation.coordinate,
            location.coordinate,
            mapRef
          );
        }
      }
    },
    [startLocation, getUserLocation, calculateRoute]
  );

  // Handle using current location (sets start and auto-calculates route)
  const handleUseCurrentLocation = useCallback(async () => {
    try {
      if (!mapRef.current) {
        Alert.alert('Error', 'Map not ready');
        return;
      }

      setIsGettingUserLocation(true);
      const location = await getUserLocation();

      if (!location) {
        Alert.alert('Error', 'Unable to get current location. Please check your location permissions.');
        setIsGettingUserLocation(false);
        return;
      }

      setStartLocation(location);

      // If destination exists, automatically calculate route
      if (destinationLocation) {
        await calculateRoute(
          location.coordinate,
          destinationLocation.coordinate,
          mapRef
        );
      } else {
        // Animate to current location if no destination
        mapRef.current?.animateToLocation(
          location.coordinate.latitude,
          location.coordinate.longitude,
          15
        );
      }
      setIsGettingUserLocation(false);
    } catch (err: any) {
      console.error('Error getting current location:', err);
      Alert.alert('Error', err.message || 'Failed to get current location');
      setIsGettingUserLocation(false);
    }
  }, [destinationLocation, calculateRoute, getUserLocation]);

  // Handle clear route
  const handleClearRoute = useCallback(() => {
    clearRoute();
    setStartLocation(null);
    setDestinationLocation(null);
  }, [clearRoute]);

  // Show error alerts
  useEffect(() => {
    if (error) {
      Alert.alert('Route Error', error);
    }
  }, [error]);

  return (
    <View className="flex-1">
      <Stack.Screen options={{ title: 'Maps' }} />
      <LocationSearchBoxes
        startLocation={startLocation}
        destinationLocation={destinationLocation}
        onStartLocationSelected={handleStartLocationSelected}
        onDestinationLocationSelected={handleDestinationLocationSelected}
        onUseCurrentLocation={handleUseCurrentLocation}
        isGettingUserLocation={isGettingUserLocation}
      />
      <OSMView
        ref={mapRef}
        style={{ flex: 1 }}
        initialCenter={{ latitude: 40.7128, longitude: -74.006 }}
        initialZoom={13}
        markers={markers}
        onMarkerPress={(id) => {
          console.log('Marker pressed:', id);
        }}
      />
      <RouteControls
        onUseCurrentLocation={handleUseCurrentLocation}
        onClearRoute={handleClearRoute}
        hasRoute={!!route}
        isCalculating={isCalculating}
        hasCurrentLocation={!!startLocation}
        isGettingUserLocation={isGettingUserLocation}
      />
      <RouteInfo
        route={route}
        formatDistance={formatDistance}
        formatDuration={formatDuration}
      />
    </View>
  );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import type { OSMViewRef } from 'expo-osm-sdk';
import type { Coordinate } from '@/types/maps';

interface Route {
  coordinates: Coordinate[];
  distance: number;
  duration: number;
}

interface NavigationState {
  isNavigating: boolean;
  currentLocation: Coordinate | null;
  distanceRemaining: number;
  timeRemaining: number;
  currentStepIndex: number;
  progress: number;
  nextTurnInstruction: string;
}

interface UseNavigationManagementProps {
  mapRef: React.RefObject<OSMViewRef | null>;
  route: Route | null;
  isMapReady: boolean;
  onNavigationComplete?: () => void;
}

// Calculate bearing between two coordinates
const calculateBearing = (from: Coordinate, to: Coordinate): number => {
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
};

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (from: Coordinate, to: Coordinate): number => {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const useNavigationManagement = ({
  mapRef,
  route,
  isMapReady,
  onNavigationComplete,
}: UseNavigationManagementProps) => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isNavigating: false,
    currentLocation: null,
    distanceRemaining: 0,
    timeRemaining: 0,
    currentStepIndex: 0,
    progress: 0,
    nextTurnInstruction: 'Head towards destination',
  });

  const isMountedRef = useRef(true);
  const navigationArrowIdRef = useRef<string>('navigation-arrow');
  const stopNavigationRef = useRef<(() => Promise<void>) | null>(null);

  // Format distance in meters to human-readable string
  const formatDistanceMeters = useCallback((meters: number): string => {
    if (isNaN(meters) || meters < 0) return '0 m';

    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }, []);

  // Format time in seconds to human-readable string
  const formatTimeSeconds = useCallback((seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0 min';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Find closest step on route
  const findClosestStepIndex = useCallback(
    (currentLocation: Coordinate): number => {
      if (!route || route.coordinates.length === 0) return 0;

      let minDistance = Infinity;
      let closestIndex = 0;

      // Sample every 3rd step for performance
      const step = Math.max(1, Math.floor(route.coordinates.length / 30));

      for (let i = 0; i < route.coordinates.length; i += step) {
        const distance = calculateDistance(currentLocation, route.coordinates[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      // Fine-tune around the closest sampled point
      const searchStart = Math.max(0, closestIndex - step);
      const searchEnd = Math.min(route.coordinates.length - 1, closestIndex + step);

      for (let i = searchStart; i <= searchEnd; i++) {
        const distance = calculateDistance(currentLocation, route.coordinates[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      return closestIndex;
    },
    [route]
  );

  // Calculate remaining distance and time
  const calculateRemaining = useCallback(
    (stepIndex: number): { distance: number; time: number } => {
      if (!route || stepIndex >= route.coordinates.length - 1) {
        return { distance: 0, time: 0 };
      }

      let distanceRemaining = 0;
      for (let i = stepIndex; i < route.coordinates.length - 1; i++) {
        distanceRemaining += calculateDistance(route.coordinates[i], route.coordinates[i + 1]);
      }

      // Estimate time based on average speed (assuming ~50 km/h)
      const averageSpeed = (50 * 1000) / 3600; // m/s
      const timeRemaining = distanceRemaining / averageSpeed;

      return { distance: distanceRemaining, time: timeRemaining };
    },
    [route]
  );

  // Get next turn instruction
  const getNextTurnInstruction = useCallback(
    (stepIndex: number): string => {
      if (!route || stepIndex >= route.coordinates.length - 2) {
        return 'Arriving at destination';
      }

      const distanceToNext = calculateDistance(
        route.coordinates[stepIndex],
        route.coordinates[stepIndex + 1]
      );

      if (distanceToNext < 50) {
        return 'Continue ahead';
      } else if (distanceToNext < 200) {
        return 'In 200m, continue ahead';
      } else if (distanceToNext < 500) {
        return 'In 500m, continue ahead';
      }

      return 'Continue on current road';
    },
    [route]
  );

  // Handle location update during navigation
  const handleLocationUpdate = useCallback(
    (location: Coordinate) => {
      // Use state updater to avoid stale closure
      setNavigationState((prev) => {
        if (!prev.isNavigating || !route || !isMountedRef.current) return prev;

        const currentStepIndex = findClosestStepIndex(location);
        const { distance, time } = calculateRemaining(currentStepIndex);
        const totalDistance = route.distance || 1; // Avoid division by zero
        const progress = totalDistance > 0 ? 1 - distance / totalDistance : 0;
        const nextTurnInstruction = getNextTurnInstruction(currentStepIndex);

        // Check if destination reached - auto-stop navigation
        if (distance < 50 && progress > 0.95) {
          // Stop navigation after a short delay to show arrival message
          setTimeout(() => {
            if (isMountedRef.current) {
              if (onNavigationComplete) {
                onNavigationComplete();
              } else if (stopNavigationRef.current) {
                stopNavigationRef.current();
              }
            }
          }, 2000);
        }

        // Update camera to follow user
        requestAnimationFrame(() => {
          if (!isMountedRef.current || !mapRef.current || !isMapReady) return;

          // Calculate bearing to next step
          if (currentStepIndex < route.coordinates.length - 1) {
            const bearing = calculateBearing(location, route.coordinates[currentStepIndex + 1]);
            mapRef.current.setBearing?.(bearing);
          }

          mapRef.current.animateToLocation?.(location.latitude, location.longitude, 18);
        });

        return {
          ...prev,
          currentLocation: location,
          distanceRemaining: distance,
          timeRemaining: time,
          currentStepIndex,
          progress,
          nextTurnInstruction:
            distance < 100 && progress > 0.95
              ? 'You have arrived at your destination'
              : nextTurnInstruction,
        };
      });
    },
    [route, findClosestStepIndex, calculateRemaining, getNextTurnInstruction, mapRef, isMapReady]
  );

  // Start navigation
  const startNavigation = useCallback(async () => {
    if (!route || !mapRef.current || !isMapReady || route.coordinates.length === 0) return;

    const startLocation = route.coordinates[0];
    const destinationLocation = route.coordinates[route.coordinates.length - 1];

    // Calculate initial remaining distance and time
    const { distance: initialDistance, time: initialTime } = calculateRemaining(0);

    setNavigationState({
      isNavigating: true,
      currentLocation: startLocation,
      distanceRemaining: initialDistance || route.distance || 0,
      timeRemaining: initialTime || route.duration || 0,
      currentStepIndex: 0,
      progress: 0,
      nextTurnInstruction: 'Starting navigation',
    });

    // Sequential camera setup with delays
    try {
      // Animate to start location
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          if (isMountedRef.current && mapRef.current && isMapReady) {
            mapRef.current.animateToLocation?.(startLocation.latitude, startLocation.longitude, 18);
          }
          setTimeout(resolve, 250);
        });
      });

      // Set pitch
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          if (isMountedRef.current && mapRef.current && isMapReady) {
            mapRef.current.setPitch?.(45);
          }
          setTimeout(resolve, 250);
        });
      });

      // Calculate and set bearing
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          if (isMountedRef.current && mapRef.current && isMapReady) {
            const bearing = calculateBearing(startLocation, destinationLocation);
            mapRef.current.setBearing?.(bearing);
          }
          setTimeout(resolve, 250);
        });
      });

      // Start location tracking
      if (isMountedRef.current && mapRef.current && isMapReady) {
        mapRef.current.startLocationTracking?.();
      }
    } catch (error) {
      console.error('Error starting navigation:', error);
    }
  }, [route, mapRef, isMapReady, calculateRemaining]);

  // Stop navigation
  const stopNavigation = useCallback(async () => {
    setNavigationState((prev) => ({
      ...prev,
      isNavigating: false,
    }));

    // Reset camera
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          if (isMountedRef.current && mapRef.current && isMapReady) {
            mapRef.current.setPitch?.(0);
          }
          setTimeout(resolve, 200);
        });
      });
    } catch (error) {
      console.error('Error stopping navigation:', error);
    }
  }, [mapRef, isMapReady]);

  // Update ref with stopNavigation
  useEffect(() => {
    stopNavigationRef.current = stopNavigation;
  }, [stopNavigation]);

  // Get navigation arrow marker with rotation
  const getNavigationArrowMarker = useCallback(() => {
    if (!navigationState.isNavigating || !navigationState.currentLocation || !route) {
      return null;
    }

    const { currentLocation, currentStepIndex } = navigationState;
    const nextStep =
      currentStepIndex < route.coordinates.length - 1
        ? route.coordinates[currentStepIndex + 1]
        : route.coordinates[route.coordinates.length - 1];

    const bearing = calculateBearing(currentLocation, nextStep);

    return {
      id: navigationArrowIdRef.current,
      coordinate: currentLocation,
      rotation: bearing,
      zIndex: 1000,
      anchor: { x: 0.5, y: 0.5 },
      // Using a simple SVG arrow icon (you can replace with lucide icon)
      icon: '▲', // This will be replaced with proper icon in the component
    };
  }, [navigationState, route]);

  return {
    navigationState,
    startNavigation,
    stopNavigation,
    handleLocationUpdate,
    getNavigationArrowMarker,
    formatDistanceMeters,
    formatTimeSeconds,
  };
};

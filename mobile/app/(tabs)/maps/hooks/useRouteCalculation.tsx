import { useState, useCallback } from 'react';
import { useOSRMRouting, type OSMViewRef, type Route } from 'expo-osm-sdk';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface UseRouteCalculationReturn {
  route: Route | null;
  isCalculating: boolean;
  error: string | null;
  calculateRoute: (
    start: Coordinate,
    destination: Coordinate,
    mapRef: React.RefObject<OSMViewRef | null>
  ) => Promise<void>;
  clearRoute: () => void;
  formatDistance: (route: Route) => string;
  formatDuration: (route: Route) => string;
}

export function useRouteCalculation(): UseRouteCalculationReturn {
  const routing = useOSRMRouting();
  const [route, setRoute] = useState<Route | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(
    async (
      start: Coordinate,
      destination: Coordinate,
      mapRef: React.RefObject<OSMViewRef | null>
    ) => {
      if (!mapRef.current) {
        setError('Map reference not available');
        return;
      }

      setIsCalculating(true);
      setError(null);

      try {
        // Type assertion: we've already checked mapRef.current is not null above
        const nonNullMapRef = mapRef as React.RefObject<OSMViewRef>;

        // Calculate and display route with car/driving profile
        const calculatedRoute = await routing.calculateAndDisplayRoute(
          start,
          destination,
          nonNullMapRef,
          {
            profile: 'driving',
            routeStyle: {
              color: '#007AFF', // Blue color for route
              width: 5,
              opacity: 0.8,
            },
          }
        );

        if (calculatedRoute) {
          setRoute(calculatedRoute);
          // Auto-fit the route in view
          await routing.fitRouteInView(calculatedRoute, nonNullMapRef, 50);
        } else {
          setError('No route found');
        }
      } catch (err: any) {
        console.error('Route calculation error:', err);
        setError(err.message || 'Failed to calculate route');
        setRoute(null);
      } finally {
        setIsCalculating(false);
      }
    },
    [routing]
  );

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
    // Note: The SDK should handle clearing the route from the map
    // when route is set to null or when calculateAndDisplayRoute is called again
  }, []);

  const formatDistance = useCallback(
    (route: Route) => {
      return routing.formatRouteDistance(route);
    },
    [routing]
  );

  const formatDuration = useCallback(
    (route: Route) => {
      return routing.formatRouteDuration(route);
    },
    [routing]
  );

  return {
    route,
    isCalculating,
    error,
    calculateRoute,
    clearRoute,
    formatDistance,
    formatDuration,
  };
}

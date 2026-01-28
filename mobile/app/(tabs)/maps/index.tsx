import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { View, Alert } from 'react-native';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { OSMView, type OSMViewRef } from 'expo-osm-sdk';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@react-navigation/native';
import { useRouteCalculation } from '@/hooks/maps/useRouteCalculation';
import { useLocationPermission } from '@/hooks/maps/useLocationPermission';
import { useMapInitialization } from '@/hooks/maps/useMapInitialization';
import { useMapMarkers } from '@/hooks/maps/useMapMarkers';
import { useLocationHandlers } from '@/hooks/maps/useLocationHandlers';
import { useNavigationManagement } from '@/hooks/maps/useNavigationManagement';
import { RouteControls } from '@/components/maps/map-control';
import { RouteInfo } from '@/components/maps/route-info';
import { NavigationPanel } from '@/components/maps/navigation-panel';
import { LocationSearchBoxes } from '@/components/maps/location-search-boxes';
import { useLocation } from '@/hooks/maps/useLocation';
import { useColorScheme } from 'nativewind';
import { useSettings } from '@/hooks/useSettings';
import { useCoordinationStore } from '@/stores/coordinationStore';

const FALLBACK_INITIAL_CENTER = { latitude: 40.7128, longitude: -74.006 };
const INITIAL_ZOOM = 20;

export default function MapsScreen() {
  const { colorScheme } = useColorScheme();
  const { colors } = useTheme();
  const router = useRouter();
  const { settings } = useSettings();
  const {
    shouldStartNavigation,
    shouldStopNavigation,
    clearNavigationRequest,
    clearNavigationStopRequest,
    requestMonitoringStart,
    requestMonitoringStop,
    setCoordinating,
  } = useCoordinationStore();

  const mapRef = useRef<OSMViewRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const bottomSheetSnapPoints = useMemo(() => ['15%', '45%', '75%'], []);

  // Force re-render when screen gains focus to handle map state issues
  const [mapKey, setMapKey] = useState(0);

  const { getLocation } = useLocation();

  // Initial map setup
  const {
    initialCenter,
    isMapReady,
    setIsMapReady,
    startLocation,
    setStartLocation,
    destinationLocation,
    setDestinationLocation,
  } = useMapInitialization({ mapRef, getLocation, initialZoom: INITIAL_ZOOM });

  // Location permission
  const { checkPermission } = useLocationPermission();

  // Route calculation
  const {
    route,
    isCalculating,
    error: routeError,
    calculateRoute,
    clearRoute,
    formatDistance,
    formatDuration,
  } = useRouteCalculation({ mapRef });

  // Ref to store stopNavigation to avoid circular dependency
  const stopNavigationRef = useRef<(() => Promise<void>) | null>(null);

  // Handle stop navigation with auto-coordination
  const handleStopNavigation = useCallback(() => {
    if (stopNavigationRef.current) {
      stopNavigationRef.current();
    }

    // Auto-stop monitoring when navigation stops (if enabled)
    if (settings.enableAutoCoordination && !useCoordinationStore.getState().isCoordinating) {
      setCoordinating(true);
      requestMonitoringStop();
      // Reset coordination flag after a delay
      setTimeout(() => setCoordinating(false), 1000);
    }
  }, [settings.enableAutoCoordination, requestMonitoringStop, setCoordinating]);

  // Navigation management
  const {
    navigationState,
    startNavigation,
    stopNavigation,
    handleLocationUpdate,
    formatDistanceMeters,
    formatTimeSeconds,
  } = useNavigationManagement({
    mapRef,
    route,
    isMapReady,
    onNavigationComplete: handleStopNavigation,
  });

  // Update ref with stopNavigation
  useEffect(() => {
    stopNavigationRef.current = stopNavigation;
  }, [stopNavigation]);

  // Location handlers
  const {
    isGettingUserLocation,
    handleStartLocationSelected,
    handleDestinationLocationSelected,
    handleUseCurrentLocation,
  } = useLocationHandlers({
    mapRef,
    startLocation,
    setStartLocation,
    destinationLocation,
    setDestinationLocation,
    getLocation,
    calculateRoute,
    initialZoom: INITIAL_ZOOM,
  });

  // Map markers
  const markers = useMapMarkers(startLocation, destinationLocation);

  // Handle calculate route (start)
  const handleCalculateRoute = useCallback(() => {
    if (startLocation && destinationLocation) {
      calculateRoute(startLocation.coordinate, destinationLocation.coordinate, mapRef);
    }
  }, [calculateRoute, startLocation, destinationLocation]);

  // Handle start navigation with auto-coordination
  const handleStartNavigation = useCallback(() => {
    startNavigation();

    // Auto-start monitoring when navigation starts (if enabled)
    // Also check if monitoring is already active to avoid unnecessary coordination
    if (
      settings.enableAutoCoordination &&
      !useCoordinationStore.getState().isCoordinating &&
      !useCoordinationStore.getState().shouldStartMonitoring
    ) {
      setCoordinating(true);
      requestMonitoringStart();
      // Navigate to monitor tab
      router.push('/(tabs)');
      // Reset coordination flag after a delay
      setTimeout(() => setCoordinating(false), 1000);
    }
  }, [
    startNavigation,
    settings.enableAutoCoordination,
    requestMonitoringStart,
    setCoordinating,
    router,
  ]);

  // Listen for requests to start navigation from monitoring
  useEffect(() => {
    if (shouldStartNavigation && route && !navigationState.isNavigating) {
      clearNavigationRequest();
      startNavigation();
    }
  }, [
    shouldStartNavigation,
    route,
    navigationState.isNavigating,
    startNavigation,
    clearNavigationRequest,
  ]);

  // Listen for requests to stop navigation from monitoring
  useEffect(() => {
    if (shouldStopNavigation && navigationState.isNavigating) {
      clearNavigationStopRequest();
      stopNavigation();
    }
  }, [
    shouldStopNavigation,
    navigationState.isNavigating,
    stopNavigation,
    clearNavigationStopRequest,
  ]);

  // Handle clear route (stop)
  const handleClearRoute = useCallback(() => {
    if (navigationState.isNavigating) {
      handleStopNavigation();
    }
    clearRoute();
    setStartLocation(null);
    setDestinationLocation(null);
  }, [
    clearRoute,
    setStartLocation,
    setDestinationLocation,
    navigationState.isNavigating,
    handleStopNavigation,
  ]);

  // Expand/collapse bottom sheet based on route and navigation state
  useEffect(() => {
    const sheet = bottomSheetRef.current;
    if (!sheet) return;

    if (route) {
      sheet.snapToIndex(0);
    } else {
      sheet.close();
    }
  }, [route, navigationState.isNavigating]);

  // Check permission on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Show error alerts
  useEffect(() => {
    if (routeError) {
      Alert.alert('Route Calculation Error', routeError);
    }
  }, [routeError]);

  // Reset map when screen gains focus to handle native map lifecycle issues
  // When navigating away and back, the native map view gets detached/reattached
  // but doesn't properly reinitialize, causing "Map not ready" errors
  useFocusEffect(
    useCallback(() => {
      // Force OSMView to remount by changing its key
      setMapKey((prev) => prev + 1);

      // Reset map ready state
      setIsMapReady(false);
    }, [setIsMapReady])
  );

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
        className="absolute left-4 right-4 top-4"
      />

      <OSMView
        key={mapKey}
        ref={mapRef}
        style={{ flex: 1 }}
        initialCenter={initialCenter ?? FALLBACK_INITIAL_CENTER}
        initialZoom={INITIAL_ZOOM}
        followUserLocation={true}
        markers={markers}
        onMapReady={() => setIsMapReady(true)}
        onMarkerPress={(id) => {
          console.log('Marker pressed:', id);
        }}
        onUserLocationChange={(location) => {
          handleLocationUpdate(location);
        }}
        styleUrl={
          colorScheme === 'dark'
            ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
            : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
        }
      />

      <RouteControls
        onUseCurrentLocation={handleUseCurrentLocation}
        onCalculateRoute={handleCalculateRoute}
        onClearRoute={handleClearRoute}
        onStartNavigation={handleStartNavigation}
        onZoomIn={mapRef.current?.zoomIn || (() => {})}
        onZoomOut={mapRef.current?.zoomOut || (() => {})}
        hasRoute={!!route}
        isCalculating={isCalculating}
        isGettingUserLocation={isGettingUserLocation}
        isNavigating={navigationState.isNavigating}
        className="absolute bottom-32 right-4"
      />

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={bottomSheetSnapPoints}
        enableDynamicSizing={false}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.primary }}>
        <BottomSheetView className="px-2 py-2">
          {navigationState.isNavigating ? (
            <NavigationPanel
              isNavigating={navigationState.isNavigating}
              distanceRemaining={navigationState.distanceRemaining}
              timeRemaining={navigationState.timeRemaining}
              nextTurnInstruction={navigationState.nextTurnInstruction}
              progress={navigationState.progress}
              onStopNavigation={handleStopNavigation}
              formatDistanceMeters={formatDistanceMeters}
              formatTimeSeconds={formatTimeSeconds}
            />
          ) : (
            <RouteInfo
              route={route}
              formatDistance={formatDistance}
              formatDuration={formatDuration}
            />
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

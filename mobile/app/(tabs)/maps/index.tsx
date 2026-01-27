import { useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Alert, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { OSMView, type OSMViewRef } from 'expo-osm-sdk';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@react-navigation/native';
import { useRouteCalculation } from '@/hooks/maps/useRouteCalculation';
import { useLocationPermission } from '@/hooks/maps/useLocationPermission';
import { useMapInitialization } from '@/hooks/maps/useMapInitialization';
import { useMapMarkers } from '@/hooks/maps/useMapMarkers';
import { useLocationHandlers } from '@/hooks/maps/useLocationHandlers';
import { RouteControls } from '@/components/maps/map-control';
import { RouteInfo } from '@/components/maps/route-info';
import { LocationSearchBoxes } from '@/components/maps/location-search-boxes';
import { useLocation } from '@/hooks/maps/useLocation';

const FALLBACK_INITIAL_CENTER = { latitude: 40.7128, longitude: -74.006 };
const INITIAL_ZOOM = 20;

export default function MapsScreen() {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();

  const mapRef = useRef<OSMViewRef>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const bottomSheetSnapPoints = useMemo(() => ['15%', '45%', '75%'], []);

  const { getLocation } = useLocation();

  // Initial map setup
  const {
    initialCenter,
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
  } = useRouteCalculation();

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

  // Handle clear route
  const handleClearRoute = useCallback(() => {
    clearRoute();
    setStartLocation(null);
    setDestinationLocation(null);
  }, [clearRoute, setStartLocation, setDestinationLocation]);

  // Expand/collapse bottom sheet based on route presence
  useEffect(() => {
    const sheet = bottomSheetRef.current;
    if (!sheet) return;

    if (route) {
      sheet.snapToIndex(0);
    } else {
      sheet.close(); // closed
    }
  }, [route]);

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
        styleUrl={
          colorScheme === 'dark'
            ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
            : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
        }
      />

      <RouteControls
        onUseCurrentLocation={handleUseCurrentLocation}
        onClearRoute={handleClearRoute}
        onZoomIn={mapRef.current?.zoomIn || (() => {})}
        onZoomOut={mapRef.current?.zoomOut || (() => {})}
        hasRoute={!!route}
        isCalculating={isCalculating}
        hasCurrentLocation={!!startLocation}
        isGettingUserLocation={isGettingUserLocation}
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
          <RouteInfo
            route={route}
            formatDistance={formatDistance}
            formatDuration={formatDuration}
          />
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

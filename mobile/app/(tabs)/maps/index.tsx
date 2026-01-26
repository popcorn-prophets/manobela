import { useRef, useState, useMemo } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { OSMView, SearchBox } from 'expo-osm-sdk';

export default function MapsScreen() {
  const mapRef = useRef<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    coordinate: { latitude: number; longitude: number };
    displayName?: string;
  } | null>(null);

  // Convert selected location to markers array
  const markers = useMemo(() => {
    if (!selectedLocation) return [];

    return [
      {
        id: 'searched-location',
        coordinate: {
          latitude: selectedLocation.coordinate.latitude,
          longitude: selectedLocation.coordinate.longitude,
        },
        title: selectedLocation.displayName || 'Selected Location',
        description: selectedLocation.displayName || 'Location from search',
      },
    ];
  }, [selectedLocation]);

  const handleLocationSelected = (location: {
    coordinate: { latitude: number; longitude: number };
    displayName?: string;
  }) => {
    // Update selected location state
    setSelectedLocation(location);

    // Animate map to selected location
    mapRef.current?.animateToLocation(
      location.coordinate.latitude,
      location.coordinate.longitude,
      15
    );
  };

  return (
    <View className="flex-1">
      <Stack.Screen options={{ title: 'Maps' }} />
      <SearchBox
        placeholder="Search for places..."
        onLocationSelected={handleLocationSelected}
        style={{ margin: 20, marginTop: 60 }}
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
    </View>
  );
}

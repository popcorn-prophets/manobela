import { useRef } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { OSMView, SearchBox } from 'expo-osm-sdk';

export default function MapsScreen() {
  const mapRef = useRef<any>(null);

  return (
    <View className="flex-1">
      <Stack.Screen options={{ title: 'Maps' }} />
      <SearchBox
        placeholder="Search for places..."
        onLocationSelected={(location) => {
          // Animate map to selected location
          mapRef.current?.animateToLocation(
            location.coordinate.latitude,
            location.coordinate.longitude,
            15
          );
        }}
        style={{ margin: 20, marginTop: 60 }}
      />
      <OSMView
        ref={mapRef}
        style={{ flex: 1 }}
        initialCenter={{ latitude: 40.7128, longitude: -74.006 }}
        initialZoom={13}
      />
    </View>
  );
}

import { View, TouchableOpacity } from 'react-native';
import { SearchBox } from 'expo-osm-sdk';
import { Navigation, MapPin } from 'lucide-react-native';

interface LocationSearchBoxesProps {
  startLocation: { coordinate: { latitude: number; longitude: number }; displayName?: string } | null;
  destinationLocation: { coordinate: { latitude: number; longitude: number }; displayName?: string } | null;
  onStartLocationSelected: (location: {
    coordinate: { latitude: number; longitude: number };
    displayName?: string;
  }) => void;
  onDestinationLocationSelected: (location: {
    coordinate: { latitude: number; longitude: number };
    displayName?: string;
  }) => void;
  onUseCurrentLocation: () => void;
  isGettingUserLocation: boolean;
}

export function LocationSearchBoxes({
  startLocation,
  destinationLocation,
  onStartLocationSelected,
  onDestinationLocationSelected,
  onUseCurrentLocation,
  isGettingUserLocation,
}: LocationSearchBoxesProps) {
  return (
    <View className="absolute top-16 left-4 right-4 z-10">
      <View className="bg-white rounded-lg shadow-lg overflow-hidden" style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}>
        {/* Start Location Search Box */}
        <View className="flex-row items-center border-b border-gray-200 bg-gray-50">
          <View className="pl-3 pr-2 py-3">
            <View className="w-2 h-2 rounded-full bg-blue-500" />
          </View>
          <View className="flex-1">
            <SearchBox
              placeholder={startLocation?.displayName || "Choose starting point"}
              onLocationSelected={onStartLocationSelected}
              style={{ margin: 0, marginTop: 0, backgroundColor: 'transparent' }}
            />
          </View>
          <TouchableOpacity
            onPress={onUseCurrentLocation}
            disabled={isGettingUserLocation}
            className="pr-3 pl-2 py-3"
          >
            <Navigation
              color={startLocation ? "#007AFF" : "#666"}
              size={20}
            />
          </TouchableOpacity>
        </View>

        {/* Destination Location Search Box */}
        <View className="flex-row items-center bg-gray-50">
          <View className="pl-3 pr-2 py-3">
            <MapPin color="#FF3B30" size={16} />
          </View>
          <View className="flex-1">
            <SearchBox
              placeholder={destinationLocation?.displayName || "Choose destination"}
              onLocationSelected={onDestinationLocationSelected}
              style={{ margin: 0, marginTop: 0, backgroundColor: 'transparent' }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}


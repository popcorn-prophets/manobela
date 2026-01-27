import { View, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { MapPin, Navigation, X } from 'lucide-react-native';

interface RouteControlsProps {
  onUseCurrentLocation: () => void;
  onClearRoute: () => void;
  hasRoute: boolean;
  isCalculating: boolean;
  hasCurrentLocation: boolean;
  isGettingUserLocation: boolean;
}

export function RouteControls({
  onUseCurrentLocation,
  onClearRoute,
  hasRoute,
  isCalculating,
  hasCurrentLocation,
  isGettingUserLocation,
}: RouteControlsProps) {
  return (
    <View className="absolute bottom-24 right-4 flex-col gap-3">
      {/* Use Current Location Button */}
      {!hasCurrentLocation && (
        <TouchableOpacity
          onPress={onUseCurrentLocation}
          disabled={isCalculating || isGettingUserLocation}
          className="rounded-full bg-blue-500 p-4 shadow-lg active:bg-blue-600"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
          {isCalculating || isGettingUserLocation ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Navigation color="white" size={24} />
          )}
        </TouchableOpacity>
      )}

      {/* Clear Route Button */}
      {hasRoute && (
        <TouchableOpacity
          onPress={onClearRoute}
          className="rounded-full bg-red-500 p-4 shadow-lg active:bg-red-600"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
          <X color="white" size={24} />
        </TouchableOpacity>
      )}
    </View>
  );
}

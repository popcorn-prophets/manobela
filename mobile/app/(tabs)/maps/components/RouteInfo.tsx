import { View, Text } from 'react-native';
import { Route } from 'expo-osm-sdk';
import { Navigation, Clock } from 'lucide-react-native';

interface RouteInfoProps {
  route: Route | null;
  formatDistance: (route: Route) => string;
  formatDuration: (route: Route) => string;
}

export function RouteInfo({ route, formatDistance, formatDuration }: RouteInfoProps) {
  if (!route) return null;

  return (
    <View
      className="absolute bottom-4 left-4 right-4 rounded-lg bg-white p-4 shadow-lg"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}>
      <View className="flex-row items-center justify-between">
        {/* Distance */}
        <View className="flex-1 flex-row items-center gap-2">
          <Navigation color="#007AFF" size={20} />
          <View>
            <Text className="text-xs text-gray-500">Distance</Text>
            <Text className="text-base font-semibold text-gray-900">{formatDistance(route)}</Text>
          </View>
        </View>

        {/* Duration */}
        <View className="flex-1 flex-row items-center gap-2">
          <Clock color="#007AFF" size={20} />
          <View>
            <Text className="text-xs text-gray-500">Duration</Text>
            <Text className="text-base font-semibold text-gray-900">{formatDuration(route)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

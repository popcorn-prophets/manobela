import { View } from 'react-native';
import { Route, type RouteStep } from 'expo-osm-sdk';
import { Navigation, Clock } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import { Text } from '@/components/ui/text';
import { TurnByTurnList } from '@/components/maps/turn-by-turn-list';
import { useMemo } from 'react';

interface RouteInfoProps {
  route: Route | null;
  formatDistance: (route: Route) => string;
  formatDuration: (route: Route) => string;
}

export function RouteInfo({ route, formatDistance, formatDuration }: RouteInfoProps) {
  const { colors } = useTheme();

  const turnInstructions = useMemo(() => {
    if (!route) return [];
    if (Array.isArray(route.steps) && route.steps.length > 0) {
      return route.steps as RouteStep[];
    }
    return [];
  }, [route]);

  const formatDistanceMeters = (meters: number): string => {
    if (isNaN(meters) || meters < 0) return '0 m';
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatTimeSeconds = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '0 min';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes} min`;
  };

  if (!route) return null;

  return (
    <View className="p-2">
      <View className="mb-6 flex-row items-center justify-between">
        {/* Distance */}
        <View className="flex-1 flex-row items-center gap-3">
          <Navigation color={colors.primary} size={20} />
          <View>
            <Text className="text-xs text-muted-foreground">Distance</Text>
            <Text className="text-base font-semibold text-foreground">{formatDistance(route)}</Text>
          </View>
        </View>

        {/* Duration */}
        <View className="flex-1 flex-row items-center gap-3">
          <Clock color={colors.primary} size={20} />
          <View>
            <Text className="text-xs text-muted-foreground">Duration</Text>
            <Text className="text-base font-semibold text-foreground">{formatDuration(route)}</Text>
          </View>
        </View>
      </View>

      {/* Turn-by-turn preview */}
      {turnInstructions.length > 0 && (
        <View>
          <Text className="mb-2 text-sm font-semibold">Steps</Text>
          <TurnByTurnList
            turnInstructions={turnInstructions}
            formatDistanceMeters={formatDistanceMeters}
            formatTimeSeconds={formatTimeSeconds}
          />
        </View>
      )}
    </View>
  );
}

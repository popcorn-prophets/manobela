import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import type { RouteStep } from 'expo-osm-sdk';

interface TurnByTurnListProps {
  turnInstructions: RouteStep[];
  formatDistanceMeters: (meters: number) => string;
  formatTimeSeconds: (seconds: number) => string;
}

export const TurnByTurnList = ({
  turnInstructions,
  formatDistanceMeters,
  formatTimeSeconds,
}: TurnByTurnListProps) => {
  return (
    <BottomSheetFlatList
      data={turnInstructions}
      keyExtractor={(item: RouteStep, index: number) => `${index}-${item.instruction}`}
      className="max-h-40"
      contentContainerClassName="gap-2"
      renderItem={({ item, index }: { item: RouteStep; index: number }) => (
        <View className="gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <View className="flex-row items-start gap-2">
            <Text className="text-xs font-semibold text-muted-foreground">{index + 1}</Text>
            <Text className="flex-1 text-sm font-medium text-foreground">{item.instruction}</Text>
          </View>
          <View className="ml-4 flex-row gap-3">
            {item.distance > 0 && (
              <View className="flex flex-row gap-1">
                <Text className="text-xs text-muted-foreground">Distance</Text>
                <Text className="text-xs font-semibold text-foreground">
                  {formatDistanceMeters(item.distance)}
                </Text>
              </View>
            )}
            {item.duration > 0 && (
              <View className="flex flex-row gap-1">
                <Text className="text-xs text-muted-foreground">Duration</Text>
                <Text className="text-xs font-semibold text-foreground">
                  {formatTimeSeconds(item.duration)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2">
          <Text className="text-sm text-muted-foreground">
            No turn-by-turn steps available yet.
          </Text>
        </View>
      }
    />
  );
};

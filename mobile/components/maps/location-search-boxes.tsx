import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { SearchBox } from '@/components/maps/search-box';
import { MapLocation } from '@/types/maps';
import { cn } from '@/lib/utils';
import { MapPin, LocateFixed, Target } from 'lucide-react-native';

interface LocationSearchBoxesProps {
  startLocation: MapLocation | null;
  destinationLocation: MapLocation | null;
  onStartLocationSelected: (location: MapLocation | null) => void;
  onDestinationLocationSelected: (location: MapLocation | null) => void;
  onUseCurrentLocation: () => void;
  isGettingUserLocation: boolean;
  className?: string;
}

export function LocationSearchBoxes({
  startLocation,
  destinationLocation,
  onStartLocationSelected,
  onDestinationLocationSelected,
  onUseCurrentLocation,
  isGettingUserLocation,
  className,
}: LocationSearchBoxesProps) {
  const { colors } = useTheme();

  return (
    <View className={cn('z-10', className)}>
      <View className="overflow-hidden rounded-lg bg-background shadow-lg">
        {/* Start */}
        <View className="flex-row items-start border-b border-border bg-background">
          <View className="py-3 pl-4">
            <Target size={16} color={colors.primary} />
          </View>

          <View className="flex-1">
            <SearchBox
              value={startLocation?.displayName}
              placeholder="Choose starting point"
              onLocationSelected={onStartLocationSelected}
              onClear={() => onStartLocationSelected(null)}
            />
          </View>

          <TouchableOpacity
            onPress={onUseCurrentLocation}
            disabled={isGettingUserLocation}
            className="py-3 pr-4">
            <LocateFixed color={colors.primary} size={16} />
          </TouchableOpacity>
        </View>

        {/* Destination */}
        <View className="flex-row items-start bg-background">
          <View className="py-3 pl-4">
            <MapPin size={16} color={colors.destructive} />
          </View>

          <View className="flex-1">
            <SearchBox
              value={destinationLocation?.displayName}
              placeholder="Choose destination"
              onLocationSelected={onDestinationLocationSelected}
              onClear={() => onDestinationLocationSelected(null)} // <-- fixed
            />
          </View>
        </View>
      </View>
    </View>
  );
}

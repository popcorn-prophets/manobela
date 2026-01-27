import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LocateFixed, X } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import { cn } from '@/lib/utils';
import { ZoomControls } from './zoom-controls';

interface RouteControlsProps {
  onUseCurrentLocation: () => void;
  onClearRoute: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  hasRoute: boolean;
  isCalculating: boolean;
  hasCurrentLocation: boolean;
  isGettingUserLocation: boolean;
  className?: string;
}

export function RouteControls({
  onUseCurrentLocation,
  onClearRoute,
  onZoomIn,
  onZoomOut,
  hasRoute,
  isCalculating,
  hasCurrentLocation,
  isGettingUserLocation,
  className,
}: RouteControlsProps) {
  const { colors } = useTheme();
  return (
    <View className={cn('flex-col gap-3', className)}>
      {/* Use Current Location Button */}
      <TouchableOpacity
        onPress={onUseCurrentLocation}
        disabled={isCalculating || isGettingUserLocation}
        className="rounded-full bg-background/80 p-3 shadow-lg active:bg-background">
        {isCalculating || isGettingUserLocation ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <LocateFixed color={colors.text} size={20} />
        )}
      </TouchableOpacity>

      {/* Zoom Controls */}
      <ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} />

      {/* Clear Route Button */}
      {hasRoute && (
        <TouchableOpacity
          onPress={onClearRoute}
          className="rounded-full bg-destructive/80 p-3 shadow-lg active:bg-destructive">
          <X color="white" size={20} />
        </TouchableOpacity>
      )}
    </View>
  );
}

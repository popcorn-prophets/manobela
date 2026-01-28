import { View } from 'react-native';
import { Frown, Meh, ScanFace } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';

interface FaceMissingIndicatorProps {
  isActive: boolean;
  faceMissing: boolean;
}

/**
 * Indicator showing face detection status with appropriate icon.
 */
export function FaceMissingIndicator({ isActive, faceMissing }: FaceMissingIndicatorProps) {
  const { colors } = useTheme();

  return (
    <View className="h-9 w-9 items-center justify-center">
      {!isActive ? (
        <Meh size={24} color="white" />
      ) : faceMissing ? (
        // @ts-ignore
        <Frown size={24} color={colors.destructive} />
      ) : (
        <ScanFace size={24} color="white" />
      )}
    </View>
  );
}

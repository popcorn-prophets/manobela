import { Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface OverlayToggleButtonProps {
  showOverlay: boolean;
  onToggle: () => void;
  color?: string;
}

/**
 * Button to toggle overlay visibility with eye icon.
 */
export function OverlayToggleButton({
  showOverlay,
  onToggle,
  color = 'white',
}: OverlayToggleButtonProps) {
  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={showOverlay ? 'Hide overlays' : 'Show overlays'}
      onPress={onToggle}
      className="h-9 w-9 items-center justify-center">
      {showOverlay ? <Eye size={24} color={color} /> : <EyeOff size={24} color={color} />}
    </Pressable>
  );
}

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Supported haptic feedback types.
 *
 * - warning: Used for urgent alerts or safety warnings.
 * - success: Used for positive confirmation (e.g., task completed).
 * - impact: Used for a medium tactile “bump” (less urgent than warning).
 * - selection: Used for UI selection feedback (light and subtle).
 */
export type HapticType = 'warning' | 'success' | 'impact' | 'selection';

export interface HapticsOptions {
  /**
   * Enable or disable haptics.
   * Defaults to true.
   */
  enabled?: boolean;

  /**
   * Type of haptic feedback to trigger.
   * Defaults to 'warning'.
   */
  type?: HapticType;
}

/**
 * Triggers haptic feedback safely.
 *
 * - Automatically ignores non-mobile platforms.
 * - Gracefully handles missing native support.
 * - Defaults to warning feedback if no type is specified.
 */
export async function triggerHaptic(options?: HapticsOptions): Promise<void> {
  const { enabled = true, type = 'warning' } = options ?? {};

  if (!enabled) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  try {
    switch (type) {
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'impact':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch {
    // ignore if unavailable
  }
}

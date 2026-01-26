import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

type CameraRecordButtonProps = {
  isRecording: boolean;
  disabled?: boolean;
  onPress: () => void;
};

/**
 * Recording button for the camera view.
 */
export const CameraRecordButton = ({
  isRecording,
  disabled = false,
  onPress,
}: CameraRecordButtonProps) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
      accessibilityState={{ disabled }}
      style={[styles.button, disabled && styles.disabledButton]}>
      <View style={[styles.outerRing]}>
        <View
          style={[
            isRecording ? styles.stopSquare : styles.innerDot,
            { backgroundColor: colors.destructive },
            disabled && { opacity: 0.5 },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledButton: {
    opacity: 0.5,
  },

  outerRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },

  innerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
});

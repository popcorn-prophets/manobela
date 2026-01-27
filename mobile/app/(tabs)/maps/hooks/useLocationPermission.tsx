import { useState, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

interface UseLocationPermissionReturn {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  checkPermission: () => Promise<boolean>;
}

export function useLocationPermission(): UseLocationPermissionReturn {
  const [hasPermission, setHasPermission] = useState(false);

  const checkPermission = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('Error checking location permission:', error);
      return false;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      // First check if permission is already granted
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

      if (existingStatus === 'granted') {
        setHasPermission(true);
        return true;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setHasPermission(true);
        return true;
      }

      // Permission denied
      if (status === 'denied') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to show your current position and calculate routes. Please enable location permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }

      setHasPermission(false);
      return false;
    } catch (error: any) {
      console.error('Error requesting location permission:', error);
      Alert.alert(
        'Permission Error',
        error.message || 'Failed to request location permission'
      );
      setHasPermission(false);
      return false;
    }
  }, []);

  return {
    hasPermission,
    requestPermission,
    checkPermission,
  };
}


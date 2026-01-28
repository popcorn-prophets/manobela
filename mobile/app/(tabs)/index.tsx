import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, View, ScrollView } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useLowBattery } from '@/hooks/useLowBattery';
import { useCamera } from '@/hooks/useCamera';
import { useMonitoringSession } from '@/hooks/useMonitoringSession';
import { useAlerts } from '@/hooks/useAlerts';
import { MediaStreamView } from '@/components/media-stream-view';
import { ConnectionStatus } from '@/components/connection-status';
import { Stack, useRouter } from 'expo-router';
import { MetricsDisplay } from '@/components/metrics/metrics-display';
import { Text } from '@/components/ui/text';
import { useSettings } from '@/hooks/useSettings';
import { useCoordinationStore } from '@/stores/coordinationStore';
import { speak } from '@/services/speech';

export default function MonitorScreen() {
  useKeepAwake();

  const router = useRouter();
  const { settings } = useSettings();
  const {
    shouldStartMonitoring,
    shouldStopMonitoring,
    clearMonitoringRequest,
    clearMonitoringStopRequest,
    requestNavigationStart,
    requestNavigationStop,
    setCoordinating,
  } = useCoordinationStore();

  const wsUrl = useMemo(() => {
    const baseUrl = settings.wsBaseUrl || process.env.EXPO_PUBLIC_WS_BASE || '';
    return baseUrl ? `${baseUrl}/driver-monitoring` : '';
  }, [settings.wsBaseUrl]);

  const { localStream } = useCamera();

  const {
    sessionState,
    inferenceData,
    clientId,
    error,
    hasCamera,
    start,
    stop,
    sessionDurationMs,
    recalibrateHeadPose,
    dataChannelState,
  } = useMonitoringSession({
    url: wsUrl,
    stream: localStream,
  });

  useAlerts({
    metrics: inferenceData?.metrics ?? null,
    enabled: sessionState === 'active',
    enableSpeechAlerts: settings.enableSpeechAlerts,
    enableHapticAlerts: settings.enableHapticAlerts,
  });

  const handleLowBattery = useCallback((level: number) => {
    Alert.alert(
      'Low Battery',
      `Battery is at ${Math.round(level * 100)}%. Please consider charging your phone.`
    );
  }, []);
  useLowBattery(0.25, handleLowBattery, sessionState === 'active');

  const handleStop = useCallback(() => {
    stop();

    // Auto-stop navigation when monitoring stops (if enabled)
    if (settings.enableAutoCoordination && !useCoordinationStore.getState().isCoordinating) {
      setCoordinating(true);
      requestNavigationStop();
      // Reset coordination flag after a delay
      setTimeout(() => setCoordinating(false), 1000);
    }
  }, [stop, settings.enableAutoCoordination, requestNavigationStop, setCoordinating]);

  const handleToggle = useCallback(() => {
    if (sessionState === 'idle') {
      start();
    } else if (sessionState === 'active') {
      handleStop();
    }
  }, [sessionState, start, handleStop]);

  // Auto-start navigation when monitoring starts (if enabled)
  // Also check if navigation is already active to avoid unnecessary coordination
  useEffect(() => {
    if (
      settings.enableAutoCoordination &&
      sessionState === 'active' &&
      !useCoordinationStore.getState().isCoordinating &&
      !useCoordinationStore.getState().shouldStartNavigation
    ) {
      setCoordinating(true);
      requestNavigationStart();
      // Navigate to maps tab
      router.push('/(tabs)/maps');
      // Reset coordination flag after a delay
      setTimeout(() => setCoordinating(false), 1000);
      // Play audio prompt if speech alerts are enabled
      if (settings.enableSpeechAlerts) {
        speak('Where do you want to go?');
      }
    }
  }, [
    sessionState,
    settings.enableAutoCoordination,
    requestNavigationStart,
    setCoordinating,
    router,
    settings.enableSpeechAlerts,
  ]);

  // Listen for requests to start monitoring from navigation
  useEffect(() => {
    if (shouldStartMonitoring && sessionState === 'idle') {
      clearMonitoringRequest();
      start();
    }
  }, [shouldStartMonitoring, sessionState, start, clearMonitoringRequest]);

  // Listen for requests to stop monitoring from navigation
  useEffect(() => {
    if (shouldStopMonitoring && sessionState === 'active') {
      clearMonitoringStopRequest();
      stop();
    }
  }, [shouldStopMonitoring, sessionState, stop, clearMonitoringStopRequest]);

  const aspectRatio = useMemo(() => {
    const width = inferenceData?.resolution?.width ?? 320;
    const height = inferenceData?.resolution?.height ?? 480;
    return width / height;
  }, [inferenceData?.resolution?.width, inferenceData?.resolution?.height]);

  const isCalibrating = inferenceData?.metrics?.head_pose?.calibrating === true;
  const canRecalibrate = sessionState === 'active' && dataChannelState === 'open';

  const lastErrorRef = useRef<string | null>(null);
  // --- Friendly Message Error block ---
  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null;
      return;
    }
    if (error === lastErrorRef.current) return;
    lastErrorRef.current = error;
    Alert.alert('Connection Error', error);
  }, [error]);

  // ------------

  return (
    <ScrollView className="flex-1 px-2 py-1">
      <Stack.Screen options={{ title: 'Monitor' }} />

      <ConnectionStatus sessionState={sessionState} clientId={clientId} error={error} />

      <View className="relative mb-4 w-full">
        <MediaStreamView
          stream={localStream}
          sessionState={sessionState}
          sessionDurationMs={sessionDurationMs}
          inferenceData={inferenceData}
          hasCamera={hasCamera}
          onToggle={handleToggle}
          onRecalibrateHeadPose={recalibrateHeadPose}
          recalibrateEnabled={canRecalibrate}
          style={{
            width: '100%',
            aspectRatio,
          }}
        />

        {sessionState === 'active' && isCalibrating && (
          <View className="absolute bottom-24 left-0 right-0 items-center" pointerEvents="none">
            <View className="rounded-full bg-black/60 px-3 py-1">
              <Text className="text-xs text-white">Calibrating head pose...</Text>
            </View>
          </View>
        )}
      </View>

      <MetricsDisplay sessionState={sessionState} metricsOutput={inferenceData?.metrics ?? null} />
    </ScrollView>
  );
}

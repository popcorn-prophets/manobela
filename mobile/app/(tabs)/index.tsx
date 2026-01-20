import { useCallback } from 'react';
import { View, ScrollView } from 'react-native';
import { useCamera } from '@/hooks/useCamera';
import { useMonitoringSession } from '@/hooks/useMonitoringSession';
import { MediaStreamView } from '@/components/media-stream-view';
import { ConnectionStatus } from '@/components/connection-status';
import { MonitoringControls } from '@/components/monitoring-controls';
import { Stack } from 'expo-router';
import { MetricsDisplay } from '@/components/metrics/metrics-display';

const WS_BASE = process.env.EXPO_PUBLIC_WS_BASE!;
const WS_URL = `${WS_BASE}/driver-monitoring`;

export default function MonitorScreen() {
  const { localStream } = useCamera();

  const {
    sessionState,
    inferenceData,
    clientId,
    transportStatus,
    connectionStatus,
    error,
    hasCamera,
    start,
    stop,
  } = useMonitoringSession({
    url: WS_URL,
    stream: localStream,
  });

  // Start/stop toggle
  const handleToggle = useCallback(() => {
    if (sessionState === 'idle') {
      start();
    } else if (sessionState === 'active') {
      stop();
    }
  }, [sessionState, start, stop]);

  return (
    <ScrollView className="flex-1 px-4 py-4">
      <Stack.Screen options={{ title: 'Monitor' }} />

      <ConnectionStatus sessionState={sessionState} clientId={clientId} error={error} />

      <View className="mb-4 w-full">
        <MediaStreamView
          stream={localStream}
          sessionState={sessionState}
          inferenceData={inferenceData}
          style={{
            width: '100%',
            aspectRatio:
              (inferenceData?.resolution?.width ?? 480) /
              (inferenceData?.resolution?.height ?? 320),
          }}
        />
      </View>

      <MonitoringControls
        sessionState={sessionState}
        hasCamera={hasCamera}
        onToggle={handleToggle}
      />

      <MetricsDisplay sessionState={sessionState} metricsOutput={inferenceData?.metrics ?? null} />
    </ScrollView>
  );
}

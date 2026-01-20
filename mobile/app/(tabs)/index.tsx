import { useCallback, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useCamera } from '@/hooks/useCamera';
import { useMonitoringSession } from '@/hooks/useMonitoringSession';
import { MediaStreamView } from '@/components/media-stream-view';
import { ConnectionStatus } from '@/components/connection-status';
import { Stack } from 'expo-router';
import { MetricsDisplay } from '@/components/metrics/metrics-display';

const WS_BASE = process.env.EXPO_PUBLIC_WS_BASE!;
const WS_URL = `${WS_BASE}/driver-monitoring`;

export default function MonitorScreen() {
  const { localStream } = useCamera();

  const { sessionState, inferenceData, clientId, error, hasCamera, start, stop } =
    useMonitoringSession({
      url: WS_URL,
      stream: localStream,
    });

  const handleToggle = useCallback(() => {
    if (sessionState === 'idle') {
      start();
    } else if (sessionState === 'active') {
      stop();
    }
  }, [sessionState, start, stop]);

  const aspectRatio = useMemo(() => {
    const width = inferenceData?.resolution?.width ?? 320;
    const height = inferenceData?.resolution?.height ?? 480;
    return width / height;
  }, [inferenceData?.resolution?.width, inferenceData?.resolution?.height]);

  return (
    <ScrollView className="flex-1 px-2 py-1">
      <Stack.Screen options={{ title: 'Monitor' }} />

      <ConnectionStatus sessionState={sessionState} clientId={clientId} error={error} />

      <View className="mb-4 w-full">
        <MediaStreamView
          stream={localStream}
          sessionState={sessionState}
          inferenceData={inferenceData}
          hasCamera={hasCamera}
          onToggle={handleToggle}
          style={{
            width: '100%',
            aspectRatio,
          }}
        />
      </View>

      <MetricsDisplay sessionState={sessionState} metricsOutput={inferenceData?.metrics ?? null} />
    </ScrollView>
  );
}

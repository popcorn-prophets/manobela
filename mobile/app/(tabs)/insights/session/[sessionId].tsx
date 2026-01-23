import React from 'react';
import { View, FlatList } from 'react-native';
import { Text } from '@/components/ui/text';
import { metrics, sessions } from '@/db/schema';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useDatabase } from '@/components/database-provider';
import { useLocalSearchParams, Stack } from 'expo-router';
import { desc, eq } from 'drizzle-orm';

export default function SessionDetailsScreen() {
  const db = useDatabase();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const { data: sessionList } = useLiveQuery(
    db.select().from(sessions).where(eq(sessions.id, sessionId)),
    [sessionId]
  );

  const session = sessionList?.[0];

  const { data: sessionMetrics = [] } = useLiveQuery(
    db
      .select()
      .from(metrics)
      .where(eq(metrics.sessionId, sessionId))
      .orderBy(desc(metrics.timestamp)),
    [sessionId]
  );

  return (
    <View className="flex-1 px-3 py-4">
      <Stack.Screen options={{ title: 'Session Details' }} />

      <Text className="mb-4 text-lg font-bold">Session Metrics</Text>

      {!session && <Text className="text-sm text-gray-500">Session not found.</Text>}

      {session && (
        <View className="mb-4 rounded border p-3">
          <Text className="font-semibold">Session</Text>
          <Text>ID: {session.id}</Text>
          <Text>Client: {session.clientId}</Text>
          <Text>Start: {new Date(session.startedAt).toLocaleString()}</Text>
          <Text>
            End: {session.endedAt ? new Date(session.endedAt).toLocaleString() : 'Still running'}
          </Text>
          <Text>Duration: {session.durationMs ?? '-'} ms</Text>
        </View>
      )}

      <Text className="mb-2 font-semibold">Metrics</Text>

      <FlatList
        data={sessionMetrics}
        keyExtractor={(item) => item.id}
        renderItem={({ item: m }) => (
          <View className="mb-3 rounded border p-3">
            <Text>Time: {new Date(m.timestamp).toLocaleTimeString()}</Text>
            <Text>EAR: {m.ear}</Text>
            <Text>MAR: {m.mar}</Text>
            <Text>Yaw: {m.yaw}</Text>
            <Text>Pitch: {m.pitch}</Text>
            <Text>Roll: {m.roll}</Text>
            <Text>Perclos: {m.perclos}</Text>
            <Text>Phone Usage: {m.phoneUsage ? 'true' : 'false'}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text className="text-sm text-gray-500">No metrics recorded for this session.</Text>
        }
      />
    </View>
  );
}

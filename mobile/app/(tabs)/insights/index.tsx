import React, { useCallback, useState } from 'react';
import { View, FlatList, Alert, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { sessions } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { sessionLogger } from '@/services/logging/session-logger';
import { useDatabase } from '@/components/database-provider';
import { useRouter } from 'expo-router';

export default function InsightsScreen() {
  const db = useDatabase();
  const router = useRouter();

  const [refreshKey, setRefreshKey] = useState(0);

  const { data: sessionList = [] } = useLiveQuery(
    db.select().from(sessions).orderBy(desc(sessions.startedAt)),
    [refreshKey]
  );

  const clearAllData = useCallback(() => {
    Alert.alert('Clear all data?', 'This will delete all sessions and metrics permanently.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.delete(sessions);
            await sessionLogger.endSession();
            await sessionLogger.reset();
            setRefreshKey((k) => k + 1);
          } catch (error) {
            console.error('Failed to clear data:', error);
            Alert.alert('Error', 'Failed to clear data. Please try again.');
          }
        },
      },
    ]);
  }, []);

  return (
    <FlatList
      data={sessionList}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <View className="px-3 py-2">
          <Text className="mb-4 text-lg font-bold">Insights</Text>

          <Button onPress={clearAllData} className="mb-4">
            <Text>Clear all sessions</Text>
          </Button>

          {sessionList.length === 0 && (
            <Text className="py-2 text-center text-sm text-gray-500">No sessions found.</Text>
          )}
        </View>
      }
      renderItem={({ item: session }) => (
        <TouchableOpacity
          onPress={() => router.push(`/insights/session/${session.id}`)}
          className="mx-3 mb-4 rounded border p-3">
          <Text className="font-semibold">Session</Text>
          <Text>ID: {session.id}</Text>
          <Text>Client: {session.clientId}</Text>
          <Text>Start: {new Date(session.startedAt).toLocaleString()}</Text>
          <Text>
            End: {session.endedAt ? new Date(session.endedAt).toLocaleString() : 'Still running'}
          </Text>
          <Text>Duration: {session.durationMs ?? '-'} ms</Text>
        </TouchableOpacity>
      )}
    />
  );
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { db } from '@/db/client';
import migrations from '@/drizzle/migrations';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { sessionLogger } from '@/services/logging/session-logger';
import { SpinningLogo } from '@/components/spinning-logo';

type DatabaseContextType = {
  db: typeof db;
  readOnly: boolean;
};

const DatabaseContext = createContext<DatabaseContextType>({
  db,
  readOnly: false,
});

export const DatabaseProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'timeout'>('loading');
  const [readOnly, setReadOnly] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    // Initialize user preference for session logging
    void sessionLogger.initUserPreference();
  }, []);

  useEffect(() => {
    if (success) {
      setStatus('ready');
      setReadOnly(false);
      sessionLogger.setReadOnly(false);
    }

    if (error) {
      // Allow app to continue in read-only mode
      setStatus('ready');
      setReadOnly(true);
      sessionLogger.setReadOnly(true);
    }

    // Timeout
    const timeout = setTimeout(() => {
      if (status === 'loading') {
        setStatus('ready');
        setReadOnly(true);
        sessionLogger.setReadOnly(true);
      }
    }, 10_000); // 10 seconds

    return () => clearTimeout(timeout);
  }, [success, error, status, attempt]);

  const retry = () => {
    setAttempt((v) => v + 1);
    setStatus('loading');
    setReadOnly(false);
    sessionLogger.setReadOnly(false);
  };

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-4">
        <SpinningLogo color="white" />
        <Text className="text-xs text-muted-foreground">Applying database migrations…</Text>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Migration failed: {error?.message}</Text>
        <Text onPress={retry}>Retry</Text>
        <Text
          onPress={() => {
            setReadOnly(true);
            setStatus('ready');
            sessionLogger.setReadOnly(true);
          }}>
          Continue in read-only mode
        </Text>
      </View>
    );
  }

  if (status === 'timeout') {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>Migration timed out.</Text>
        <Text onPress={retry}>Retry</Text>
        <Text
          onPress={() => {
            setReadOnly(true);
            setStatus('ready');
            sessionLogger.setReadOnly(true);
          }}>
          Continue in read-only mode
        </Text>
      </View>
    );
  }

  return <DatabaseContext.Provider value={{ db, readOnly }}>{children}</DatabaseContext.Provider>;
};

export const useDatabase = () => useContext(DatabaseContext);

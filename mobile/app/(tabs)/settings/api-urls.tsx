import { useEffect, useState, useMemo } from 'react';
import { ScrollView, TextInput, View, } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Stack } from 'expo-router';
import { useSettings } from '../../../hooks/useSettings';
import { validateApiBaseUrl, validateWsBaseUrl } from '@/lib/settings';

export default function SettingsScreen() {
  const { settings, isLoading, saveSettings } = useSettings();
  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [wsBaseUrl, setWsBaseUrl] = useState(settings.wsBaseUrl);
  const [errors, setErrors] = useState<{ apiBaseUrl?: string; wsBaseUrl?: string }>({});
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    setApiBaseUrl(settings.apiBaseUrl);
    setWsBaseUrl(settings.wsBaseUrl);
  }, [settings.apiBaseUrl, settings.wsBaseUrl]);

  const hasChange = useMemo(() => {
    // Trim them down and ensure its not the same or an invalid input
    return apiBaseUrl.trim() !== settings.apiBaseUrl || wsBaseUrl.trim () !== settings.wsBaseUrl;
  }, [apiBaseUrl, wsBaseUrl, settings.apiBaseUrl, settings.wsBaseUrl]);

  const restartApp = async () => {
    const trimmedApiBaseUrl = apiBaseUrl.trim();
    const trimmedWsBaseUrl = wsBaseUrl.trim();
  }

  const handleSave = async () => {
    const trimmedApiBaseUrl = apiBaseUrl.trim();
    const trimmedWsBaseUrl = wsBaseUrl.trim();

    const nextErrors: { apiBaseUrl?: string; wsBaseUrl?: string } = {};

    // --- GUARDS ---
    if (!validateApiBaseUrl(trimmedApiBaseUrl)) {
      nextErrors.apiBaseUrl = 'Enter a valid http(s) URL.';
    }

    if (!validateWsBaseUrl(trimmedWsBaseUrl)) {
      nextErrors.wsBaseUrl = 'Enter a valid ws(s) URL.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage('');
      return;
    }
    // --------

    await saveSettings({
      apiBaseUrl: trimmedApiBaseUrl,
      wsBaseUrl: trimmedWsBaseUrl,
    });
    setStatusMessage('API URLs saved. \nPlease Restart the App.');
  };

  // if (changed) {
  //   setRestartRequired(true);
  // }

  return (
       <ScrollView className="flex-1 px-4 py-4">
      <Stack.Screen options={{ title: 'API' }} />

      <View className="mb-6">
        <Text className="mb-2 text-base font-semibold">API Base URL</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-md border border-border bg-background px-3 py-2 text-base text-foreground"
          editable={!isLoading}
          onChangeText={setApiBaseUrl}
          placeholder="https://api.example.com"
          value={apiBaseUrl}
        />
        {errors.apiBaseUrl ? (
          <Text className="mt-1 text-sm text-destructive">{errors.apiBaseUrl}</Text>
        ) : null}
      </View>

      <View className="mb-6">
        <Text className="mb-2 text-base font-semibold">WebSocket Base URL</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          className="rounded-md border border-border bg-background px-3 py-2 text-base text-foreground"
          editable={!isLoading}
          onChangeText={setWsBaseUrl}
          placeholder="wss://ws.example.com"
          value={wsBaseUrl}
        />
        {errors.wsBaseUrl ? (
          <Text className="mt-1 text-sm text-destructive">{errors.wsBaseUrl}</Text>
        ) : null}
      </View>

      <Button className="mb-3" disabled={isLoading} onPress={handleSave}>
        <Text>{isLoading ? 'Loading...' : 'Save API'}</Text>
      </Button>

      {statusMessage ? (
        <Text className="text-sm text-foreground">{statusMessage}</Text>
      ) : null}
    </ScrollView>
  );
}

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Settings = {
  apiBaseUrl: string;
  wsBaseUrl: string;

  enableSpeechAlerts: boolean;
  enableHapticAlerts: boolean;
};

const SETTINGS_KEY = 'app-settings';

const DEFAULT_API_BASE = 'https://api.manobela.site';
const DEFAULT_WS_BASE = 'wss://api.manobela.site/ws';

export const defaultSettings: Settings = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE ?? DEFAULT_API_BASE,
  wsBaseUrl: process.env.EXPO_PUBLIC_WS_BASE ?? DEFAULT_WS_BASE,

  enableSpeechAlerts: true,
  enableHapticAlerts: true,
};

const mergeSettings = (stored?: Partial<Settings>): Settings => {
  const api = stored?.apiBaseUrl?.trim();
  const ws = stored?.wsBaseUrl?.trim();

  return {
    ...defaultSettings,
    ...(api ? { apiBaseUrl: api } : {}),
    ...(ws ? { wsBaseUrl: ws } : {}),
    ...(typeof stored?.enableSpeechAlerts === 'boolean'
      ? { enableSpeechAlerts: stored.enableSpeechAlerts }
      : {}),
    ...(typeof stored?.enableHapticAlerts === 'boolean'
      ? { enableHapticAlerts: stored.enableHapticAlerts }
      : {}),
  };
};

const validateUrl = (value: string, allowedProtocols: string[]) => {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return allowedProtocols.includes(url.protocol);
  } catch {
    return false;
  }
};

export const validateApiBaseUrl = (value: string) => validateUrl(value, ['http:', 'https:']);

export const validateWsBaseUrl = (value: string) => validateUrl(value, ['ws:', 'wss:']);

export const loadSettings = async (): Promise<Settings> => {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!stored) return mergeSettings();

    const parsed = JSON.parse(stored) as Partial<Settings>;
    return mergeSettings(parsed);
  } catch {
    return mergeSettings();
  }
};

export const saveSettings = async (settings: Settings): Promise<void> => {
  const value = JSON.stringify(settings);
  await AsyncStorage.setItem(SETTINGS_KEY, value);
};

export const clearSettings = async (): Promise<void> => {
  await AsyncStorage.removeItem(SETTINGS_KEY);
};

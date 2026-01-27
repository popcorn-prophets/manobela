import type { ReactNode } from 'react';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  defaultSettings,
  loadSettings,
  saveSettings as saveSettingsToStorage,
  type Settings,
} from '../lib/settings';
import { sessionLogger } from '@/services/logging/session-logger';

type SettingsContextValue = {
  settings: Settings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  saveSettings: (nextSettings: Settings) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

const useSettingsState = (): SettingsContextValue => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshSettings = useCallback(async () => {
    const id = ++requestIdRef.current;
    setIsLoading(true);

    try {
      const storedSettings = await loadSettings();
      if (!mountedRef.current || id !== requestIdRef.current) return;
      setSettings(storedSettings);
      sessionLogger.setUserLoggingEnabled(storedSettings.enableSessionLogging);
    } finally {
      if (mountedRef.current && id === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const saveSettings = useCallback(async (nextSettings: Settings) => {
    // bump requestId so any in-flight refresh can't overwrite this
    requestIdRef.current += 1;

    await saveSettingsToStorage(nextSettings);
    if (!mountedRef.current) return;

    setSettings(nextSettings);

    // Update sessionLogger preference when enableSessionLogging changes
    sessionLogger.setUserLoggingEnabled(nextSettings.enableSessionLogging);
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  return {
    settings,
    isLoading,
    refreshSettings,
    saveSettings,
  };
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const value = useSettingsState();
  return createElement(SettingsContext.Provider, { value }, children);
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

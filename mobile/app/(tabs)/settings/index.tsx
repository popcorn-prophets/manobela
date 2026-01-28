import { useMemo } from 'react';
import { Linking, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useColorScheme } from 'nativewind';
import { useInsightRefresh } from '@/hooks/useInsightsRefresh';
import { useDatabase } from '@/components/database-provider';
import { useSettings } from '@/hooks/useSettings';
import { clearLoggedSessions } from '@/services/logging/clear-logged-sessions';
import { Section } from '@/components/setting/settings-section';
import { SettingRow } from '@/components/setting/settings-row';
import { Switch } from '@/components/ui/switch';
import {
  Trash2,
  Globe,
  HelpCircle,
  Github,
  Info,
  ShieldCheck,
  FileText,
  Languages,
  SunMoon,
  Bell,
  Vibrate,
  BookOpenText,
  Braces,
  Mail,
  Bug,
  Lightbulb,
  Database,
  Link,
} from 'lucide-react-native';

const websiteUrl = process.env.EXPO_PUBLIC_WEBSITE_BASE || 'https://manobela.site';
const githubUrl =
  process.env.EXPO_PUBLIC_GITHUB_BASE || 'https://github.com/popcorn-prophets/manobela';

const LINKS = {
  faq: `${websiteUrl}/#faq`,
  contact: `${websiteUrl}/#contact`,
  reportBug: `${githubUrl}/issues/new?labels=enhancement&template=feature_request.md`,
  requestFeature: `${githubUrl}/issues/new?labels=enhancement&template=feature_request.md`,
  privacy: `${websiteUrl}/privacy`,
  terms: `${websiteUrl}/terms`,
};

export default function SettingsScreen() {
  const { db } = useDatabase();
  const { refresh: refreshInsights } = useInsightRefresh();
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();

  const { settings, saveSettings } = useSettings();

  const isDarkMode = colorScheme === 'dark';
  const appName = Constants.expoConfig?.name ?? 'Manobela';
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const aboutValue = useMemo(() => `${appName} • v${appVersion}`, [appName, appVersion]);

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('Failed to open URL', url, e);
    }
  };

  const handleClearLoggedSessions = () => {
    Alert.alert('Clear logged data?', 'This will permanently delete all sessions and metrics.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearLoggedSessions(db);
            refreshInsights();
          } catch (err) {
            console.error('Failed to clear logged stats', err);
            Alert.alert('Error', 'Failed to clear data.');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 px-4 py-4">
      <Stack.Screen options={{ title: 'Settings' }} />

      <Section title="Appearance">
        <SettingRow
          icon={SunMoon}
          label="Theme"
          value={isDarkMode ? 'Dark' : 'Light'}
          rightElement={
            <Switch
              checked={isDarkMode}
              onCheckedChange={(v) => setColorScheme(v ? 'dark' : 'light')}
              disabled={false}
            />
          }
        />
      </Section>

      <Section title="Language">
        <SettingRow icon={Languages} label="English" value="Only language available" disabled />
      </Section>

      <Section title="Alerts">
        <SettingRow
          icon={Bell}
          label="Voice Alerts"
          value={settings.enableSpeechAlerts ? 'On' : 'Off'}
          rightElement={
            <Switch
              checked={settings.enableSpeechAlerts}
              onCheckedChange={(v) =>
                saveSettings({
                  ...settings,
                  enableSpeechAlerts: v,
                })
              }
            />
          }
        />

        <SettingRow
          icon={Vibrate}
          label="Haptic Alerts"
          value={settings.enableHapticAlerts ? 'On' : 'Off'}
          rightElement={
            <Switch
              checked={settings.enableHapticAlerts}
              onCheckedChange={(v) =>
                saveSettings({
                  ...settings,
                  enableHapticAlerts: v,
                })
              }
            />
          }
        />
      </Section>

      <Section title="Privacy">
        <SettingRow
          icon={Database}
          label="Session Logging"
          value={settings.enableSessionLogging ? 'On' : 'Off'}
          rightElement={
            <Switch
              checked={settings.enableSessionLogging}
              onCheckedChange={(v) =>
                saveSettings({
                  ...settings,
                  enableSessionLogging: v,
                })
              }
            />
          }
        />
      </Section>

      <Section title="Navigation">
        <SettingRow
          icon={Link}
          label="Auto-Coordination"
          value={settings.enableAutoCoordination ? 'On' : 'Off'}
          rightElement={
            <Switch
              checked={settings.enableAutoCoordination}
              onCheckedChange={(v) =>
                saveSettings({
                  ...settings,
                  enableAutoCoordination: v,
                })
              }
            />
          }
        />
      </Section>

      <Section title="Support & Feedback">
        <SettingRow icon={BookOpenText} label="Guide" onPress={() => router.push('/guide')} />
        <SettingRow icon={HelpCircle} label="FAQ" onPress={() => handleOpenLink(LINKS.faq)} />
        <SettingRow icon={Mail} label="Contact" onPress={() => handleOpenLink(LINKS.contact)} />
        <SettingRow
          icon={Bug}
          label="Report Issues"
          onPress={() => handleOpenLink(LINKS.reportBug)}
        />
        <SettingRow
          icon={Lightbulb}
          label="Request Features"
          onPress={() => handleOpenLink(LINKS.requestFeature)}
        />
      </Section>

      <Section title="About">
        <SettingRow icon={Info} label="App" value={aboutValue} />
        <SettingRow icon={Github} label="Open Source" onPress={() => handleOpenLink(githubUrl)} />
      </Section>

      <Section title="Legal">
        <SettingRow
          icon={ShieldCheck}
          label="Privacy Policy"
          onPress={() => handleOpenLink(LINKS.privacy)}
        />
        <SettingRow
          icon={FileText}
          label="Terms of Service"
          onPress={() => handleOpenLink(LINKS.terms)}
        />
      </Section>

      <Section title="API">
        <SettingRow
          icon={Braces}
          label="Go to API"
          onPress={() => handleOpenLink(settings.apiBaseUrl)}
        />
        <SettingRow
          icon={Globe}
          label="Configure URL"
          onPress={() => router.push('/settings/api-urls')}
        />
      </Section>

      <Section title="Danger Zone" destructive>
        <SettingRow
          icon={Trash2}
          label="Clear Logged Sessions"
          onPress={handleClearLoggedSessions}
          destructive
        />
      </Section>
    </ScrollView>
  );
}

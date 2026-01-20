import { useMemo, type ReactNode } from 'react';
import { Linking, ScrollView, Switch, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { SettingRow } from '@/components/setting/settings-row';
import { Section } from '@/components/setting/settings-section'

import {
  Globe,
  HelpCircle,
  Github,
  Info,
  Link2,
  ShieldCheck,
  FileText,
  Languages,
  SunMoon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';

const LINKS = {
  faq: 'https://github.com/popcorn-prophets/manobela/blob/main/README.md',
  issues: 'https://github.com/popcorn-prophets/manobela/issues',
  privacy: 'https://github.com/popcorn-prophets/manobela/blob/master/CODE_OF_CONDUCT.md',
  terms: 'https://github.com/popcorn-prophets/manobela/blob/master/LICENSE',
  dataProtection: 'https://github.com/popcorn-prophets/manobela/blob/master/CODE_OF_CONDUCT.md',
};



export default function SettingsScreen() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();

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
              accessibilityLabel="Toggle dark mode"
              onValueChange={(value) => setColorScheme(value ? 'dark' : 'light')}
              value={isDarkMode}
            />
          }
        />
      </Section>

      <Section title="Language">
        <SettingRow icon={Languages} label="English" value="Only language available" disabled />
      </Section>

      <Section title="Support & Feedback">
        <SettingRow icon={HelpCircle} label="FAQ" onPress={() => handleOpenLink(LINKS.faq)} />
        <SettingRow icon={Github} label="GitHub Issues" onPress={() => handleOpenLink(LINKS.issues)} />
      </Section>

      <Section title="About">
        <SettingRow icon={Info} label="App" value={aboutValue} />
      </Section>

      <Section title="API">
        <SettingRow icon={Globe} label="Configure URL" onPress={() => router.push('/settings/api-websocket')} />
      </Section>

      <Section title="Legal & Compliance">
        <SettingRow icon={ShieldCheck} label="Privacy Policy" onPress={() => handleOpenLink(LINKS.privacy)} />
        <SettingRow icon={FileText} label="Terms & Conditions" onPress={() => handleOpenLink(LINKS.terms)} />
        <SettingRow icon={Link2} label="Data Protection" onPress={() => handleOpenLink(LINKS.dataProtection)} />
      </Section>
    </ScrollView>
  );
}

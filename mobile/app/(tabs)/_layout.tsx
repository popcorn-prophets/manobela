import { Tabs } from 'expo-router';
import { ChartScatter, Aperture, Bolt, HardDriveUpload, Map } from 'lucide-react-native';
import { ThemeToggle } from '@/components/theme-toggle';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerRight: () => <ThemeToggle />,

        headerTitleStyle: {
          marginLeft: 8,
        },

        headerRightContainerStyle: {
          paddingRight: 12,
        },
      }}>
      <Tabs.Screen
        name="insights/index"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <ChartScatter color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="maps"
        options={{
          title: 'Maps',
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          title: 'Monitor',
          tabBarIcon: ({ color, size }) => <Aperture color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="uploads"
        options={{
          title: 'Uploads',
          tabBarIcon: ({ color, size }) => <HardDriveUpload color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Bolt color={color} size={size} />,
        }}
      />

      {/* Hidden compartments from tab navigation: */}
      <Tabs.Screen name="settings/api-urls" options={{ href: null }} />
      <Tabs.Screen name="insights/session/[sessionId]" options={{ href: null }} />
    </Tabs>
  );
}

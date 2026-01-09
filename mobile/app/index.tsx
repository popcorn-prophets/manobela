import { Text } from '@/components/ui/text';
import { Stack } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { ThemeToggle } from '@/components/theme-toggle';

const SCREEN_OPTIONS = {
  title: 'Manobela',
  headerRight: () => <ThemeToggle />,
};

export default function Screen() {
  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className="flex-1 items-center justify-center">
        <Text>Hello</Text>
      </View>
    </>
  );
}

import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';


export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

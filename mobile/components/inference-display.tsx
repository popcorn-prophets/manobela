import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { SessionState } from '@/hooks/useMonitoringSession';

interface InferenceDisplayProps {
  sessionState: SessionState;
  data: Record<string, any>;
}

export const InferenceDisplay = ({ sessionState, data }: InferenceDisplayProps) => {
  if (sessionState !== 'active') return null;

  return (
    <View className="mb-4">
      <Text className="mb-1 font-semibold">Inference Results:</Text>
      <Text className="font-mono text-xs">
        {data ? JSON.stringify(data, null, 2) : 'Waiting for data...'}
      </Text>
    </View>
  );
};

import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { SessionState } from '@/hooks/useMonitoringSession';
import { InferenceData } from '@/types/inference';

interface InferenceDisplayProps {
  sessionState: SessionState;
  data: InferenceData | null;
}

export const InferenceDisplay = ({ sessionState, data }: InferenceDisplayProps) => {
  // Hide if session is not active
  if (sessionState !== 'active') return null;

  if (!data) {
    return (
      <View className="mb-4">
        <Text className="mb-1 font-semibold">Inference Results</Text>
        <Text className="font-mono text-xs">Waiting for data...</Text>
      </View>
    );
  }

  // Filter out unnecessary keys
  const exclude = ['face_landmarks', 'object_detections'];
  const entries = Object.entries(data).filter(([key]) => !exclude.includes(key));

  return (
    <View className="mb-4">
      <Text className="mb-1 font-semibold">Inference Results</Text>
      <View className="pl-2">
        {entries.map(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            // Nested object: display keys/values individually
            return (
              <View key={key} className="mb-1">
                <Text className="text-xs">{key}:</Text>
                {Object.entries(value).map(([subKey, subValue]) => (
                  <Text key={subKey} className="pl-2 text-xs">
                    {subKey}: {JSON.stringify(subValue)}{' '}
                  </Text>
                ))}
              </View>
            );
          }

          // Primitive value
          return (
            <Text key={key} className="mb-1 text-xs">
              {key}: {value}
            </Text>
          );
        })}
      </View>
    </View>
  );
};

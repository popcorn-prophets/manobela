import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/text';
import { SessionState } from '@/hooks/useMonitoringSession';

interface ConnectionStatusProps {
  sessionState: SessionState;
  clientId: string | null;
  error: string | null;
}

export const ConnectionStatus = ({ sessionState, clientId, error }: ConnectionStatusProps) => {
  const [showFullId, setShowFullId] = useState(false);

  const statusColor = (() => {
    if (sessionState === 'active') return 'text-green-600';
    if (sessionState === 'starting' || sessionState === 'stopping') return 'text-yellow-600';
    if (error) return 'text-red-600';
    return 'text-muted-foreground';
  })();

  const statusLabel = (() => {
    if (sessionState === 'active') return 'ON';
    if (sessionState === 'starting') return 'START';
    if (sessionState === 'stopping') return 'STOP';
    return 'IDLE';
  })();

  const truncatedClientId = clientId ? `${clientId.slice(0, 6)}...${clientId.slice(-4)}` : 'No ID';

  return (
    <View className="w-full flex-row items-center justify-between py-1">
      <Text className={`text-xs font-semibold ${statusColor} text-center`}>{statusLabel}</Text>

      <TouchableOpacity onPress={() => setShowFullId((prev) => !prev)} activeOpacity={0.7}>
        <Text className="text-center text-xs text-muted-foreground">
          {clientId ? 'ID: ' + (showFullId ? clientId : truncatedClientId) : 'No ID'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

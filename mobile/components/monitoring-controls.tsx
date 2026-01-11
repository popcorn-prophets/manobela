import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { SessionState } from '@/hooks/useMonitoringSession';

interface MonitoringControlsProps {
  sessionState: SessionState;
  hasCamera: boolean;
  onToggle: () => void;
}

export const MonitoringControls = ({
  sessionState,
  hasCamera,
  onToggle,
}: MonitoringControlsProps) => {
  const isDisabled = !hasCamera || sessionState === 'starting' || sessionState === 'stopping';

  const buttonText = (() => {
    if (!hasCamera) return 'No camera';
    if (sessionState === 'starting') return 'Connecting...';
    if (sessionState === 'stopping') return 'Stopping...';
    if (sessionState === 'active') return 'Stop';
    return 'Start';
  })();

  return (
    <Button
      onPress={onToggle}
      disabled={isDisabled}
      className="mb-4 w-full"
      variant={sessionState === 'active' ? 'destructive' : 'default'}>
      <Text className="text-center">{buttonText}</Text>
    </Button>
  );
};

import { useState, useEffect, useCallback } from 'react';
import { useWebRTC } from './useWebRTC';
import { MediaStream } from 'react-native-webrtc';

export type SessionState = 'idle' | 'starting' | 'active' | 'stopping';

interface UseMonitoringSessionProps {
  url: string;
  stream: MediaStream | null;
}

interface UseMonitoringSessionReturn {
  sessionState: SessionState;
  inferenceData: Record<string, any>;
  clientId: string | null;
  transportStatus: string;
  connectionStatus: string;
  error: string | null;
  hasCamera: boolean;
  start: () => void;
  stop: () => void;
}

export const useMonitoringSession = ({
  url,
  stream,
}: UseMonitoringSessionProps): UseMonitoringSessionReturn => {
  const {
    clientId,
    startConnection,
    cleanup,
    transportStatus,
    connectionStatus,
    onDataMessage,
    error,
  } = useWebRTC({ url, stream });

  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [inferenceData, setInferenceData] = useState<Record<string, any>>({});

  // Sync session state with WebRTC connection status
  useEffect(() => {
    if (connectionStatus === 'connected' && sessionState === 'starting') {
      setSessionState('active');
    } else if (connectionStatus === 'closed' && sessionState === 'stopping') {
      setSessionState('idle');
    } else if (connectionStatus === 'failed') {
      setSessionState('idle');
    }
  }, [connectionStatus, sessionState]);

  // Handle incoming inference data
  useEffect(() => {
    const handler = (msg: any) => {
      setInferenceData(msg);
    };

    onDataMessage(handler);
  }, [onDataMessage]);

  const start = useCallback(() => {
    if (sessionState !== 'idle') return;

    try {
      setSessionState('starting');
      startConnection();
    } catch (err) {
      console.error('Failed to start connection:', err);
      setSessionState('idle');
    }
  }, [sessionState, startConnection]);

  const stop = useCallback(() => {
    if (sessionState !== 'active') return;

    setSessionState('stopping');
    cleanup();
    setSessionState('idle');
    setInferenceData({});
  }, [sessionState, cleanup]);

  return {
    sessionState,
    clientId,
    transportStatus,
    connectionStatus,
    hasCamera: stream !== null,
    inferenceData,
    error,
    start,
    stop,
  };
};

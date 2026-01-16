import { useState, useEffect, useCallback } from 'react';
import { useWebRTC } from './useWebRTC';
import { MediaStream } from 'react-native-webrtc';
import { InferenceData } from '@/types/inference';

export type SessionState = 'idle' | 'starting' | 'active' | 'stopping';

interface UseMonitoringSessionProps {
  // WebSocket signaling endpoint
  url: string;

  // Local media stream (camera)
  stream: MediaStream | null;
}

interface UseMonitoringSessionReturn {
  sessionState: SessionState;
  // Latest data from the session
  inferenceData: InferenceData | null;
  clientId: string | null;
  transportStatus: string;
  connectionStatus: string;
  error: string | null;
  hasCamera: boolean;
  start: () => void;
  stop: () => void;
}

/**
 * Manages the lifecycle of a driver monitoring session.
 * It wraps WebRTC connection and data channel logic for higher-level session handling.
 */
export const useMonitoringSession = ({
  url,
  stream,
}: UseMonitoringSessionProps): UseMonitoringSessionReturn => {
  // Low-level WebRTC management
  const {
    clientId,
    startConnection,
    cleanup,
    transportStatus,
    connectionStatus,
    onDataMessage,
    error,
  } = useWebRTC({ url, stream });

  // Tracks session lifecycle
  const [sessionState, setSessionState] = useState<SessionState>('idle');

  // Stores latest data
  const [inferenceData, setInferenceData] = useState<InferenceData | null>(null);

  // Sync session state with WebRTC connection
  useEffect(() => {
    if (connectionStatus === 'connected' && sessionState === 'starting') {
      setSessionState('active');
    } else if (connectionStatus === 'closed' && sessionState === 'stopping') {
      setSessionState('idle');
    } else if (connectionStatus === 'failed') {
      setSessionState('idle');
    }
  }, [connectionStatus, sessionState]);

  // Subscribe to data channel messages
  useEffect(() => {
    const handler = (msg: any) => {
      setInferenceData(msg);
    };

    onDataMessage(handler);
  }, [onDataMessage]);

  // Starts the monitoring session.
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

  // Stops the monitoring session.
  const stop = useCallback(() => {
    if (sessionState !== 'active') return;

    setSessionState('stopping');
    cleanup();
    setSessionState('idle');
    setInferenceData(null);
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

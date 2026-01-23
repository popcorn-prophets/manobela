import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebRTC } from './useWebRTC';
import { MediaStream } from 'react-native-webrtc';
import { sessionLogger } from '@/services/logging/session-logger';
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
  sessionDurationMs: number;
  transportStatus: string;
  connectionStatus: string;
  error: string | null;
  hasCamera: boolean;
  errorDetails: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
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
    errorDetails,
  } = useWebRTC({ url, stream });

  // Tracks session lifecycle
  const [sessionState, setSessionState] = useState<SessionState>('idle');

  // Use a ref to avoid re-rendering on every message
  const latestInferenceRef = useRef<InferenceData | null>(null);

  // Only update state when UI needs it
  const [inferenceData, setInferenceData] = useState<InferenceData | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [sessionDurationMs, setSessionDurationMs] = useState(0);

  // Sync session state with WebRTC connection
  useEffect(() => {
    if (connectionStatus === 'failed') {
      (async () => {
        await sessionLogger.endSession();
        setSessionState('idle');
      })();
      return;
    }

    if (connectionStatus === 'connected' && sessionState === 'starting') {
      if (!clientId) return;

      (async () => {
        await sessionLogger.startSession(clientId);
        setSessionState('active');
      })();
    }
  }, [connectionStatus, sessionState, clientId]);

  useEffect(() => {
    if (sessionState === 'active') {
      if (sessionStartedAt === null) {
        const now = Date.now();
        setSessionStartedAt(now);
        setSessionDurationMs(0);
      }
      return;
    }

    if (sessionState === 'idle') {
      setSessionStartedAt(null);
      setSessionDurationMs(0);
    }
  }, [sessionState, sessionStartedAt]);

  useEffect(() => {
    if (sessionState !== 'active' || sessionStartedAt === null) return;

    const tick = () => {
      setSessionDurationMs(Date.now() - sessionStartedAt);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [sessionState, sessionStartedAt]);

  // Subscribe to data channel messages
  useEffect(() => {
    const handler = (msg: any) => {
      // Update ref for logging (non-rendering)
      latestInferenceRef.current = msg;

      // Update state only if UI is active and needs it
      if (sessionState === 'active') {
        setInferenceData(msg);
      }
    };

    onDataMessage(handler);
  }, [onDataMessage, sessionState]);

  // Log metrics
  useEffect(() => {
    if (sessionState !== 'active') return;

    const interval = setInterval(() => {
      if (!sessionLogger.getCurrentSessionId()) return;
      sessionLogger.logMetrics(latestInferenceRef.current);
    }, 500);

    return () => clearInterval(interval);
  }, [sessionState]);

  const start = useCallback(async () => {
    if (sessionState !== 'idle') return;

    setSessionState('starting');
    try {
      startConnection();
    } catch (err) {
      console.error('Failed to start connection:', err);
      setSessionState('idle');
    }
  }, [sessionState, startConnection]);

  // Stops the monitoring session.
  const stop = useCallback(async () => {
    if (sessionState !== 'active') return;

    setSessionState('stopping');
    cleanup();

    await sessionLogger.endSession();

    setSessionState('idle');
    setInferenceData(null);
    latestInferenceRef.current = null;
  }, [sessionState, cleanup]);

  return {
    sessionState,
    clientId,
    transportStatus,
    connectionStatus,
    hasCamera: stream !== null,
    inferenceData,
    sessionDurationMs,
    error,
    errorDetails,
    start,
    stop,
  };
};

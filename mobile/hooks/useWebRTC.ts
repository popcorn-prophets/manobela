import {
  ICECandidateMessage,
  MessageType,
  SDPMessage,
  SignalingMessage,
  SignalingTransport,
  TransportStatus,
} from '@/types/webrtc';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MediaStream, RTCPeerConnection } from 'react-native-webrtc';
import { WebSocketTransport } from '@/services/signaling/web-socket-transport';
import RTCDataChannel from 'react-native-webrtc/lib/typescript/RTCDataChannel';
import { fetchIceServers } from '@/services/ice-servers';
import { useSettings } from './useSettings';
import { mapNetworkErrorMessage } from '@/services/network-error';
import NetInfo from '@react-native-community/netinfo';

interface UseWebRTCProps {
  // WebSocket signaling endpoint
  url: string;

  // Local media stream (camera)
  stream: MediaStream | null;

  // Optional override for RTC configuration
  rtcConfig?: RTCConfiguration;
}

export type DataChannelState = 'connecting' | 'open' | 'closing' | 'closed';

interface UseWebRTCReturn {
  transportStatus: TransportStatus;
  connectionStatus: RTCPeerConnectionState;
  dataChannelState: DataChannelState;
  clientId: string | null;
  error: string | null;
  errorDetails: string | null; // implement in return

  // Starts signaling + peer connection negotiation
  startConnection: () => void;

  // Tears down transport, peer connection, and channels
  cleanup: () => void;

  // Low-level escape hatches
  sendSignalingMessage: (msg: SignalingMessage) => void;
  onSignalingMessage: (handler: (msg: SignalingMessage) => void) => () => void;
  sendDataMessage: (msg: any) => void;
  onDataMessage: (handler: (msg: any) => void) => () => void;
}

/**
 * Manages WebRTC peer connection, signaling, and data channel lifecycle.
 */
export const useWebRTC = ({ url, stream }: UseWebRTCProps): UseWebRTCReturn => {
  const { settings } = useSettings();

  // Assigned by signaling server on WELCOME
  const [clientId, setClientId] = useState<string | null>(null);

  // Mirrors RTCPeerConnection.connectionState
  const [connectionStatus, setConnectionStatus] = useState<RTCPeerConnectionState>('new');

  // Long-lived mutable references (never trigger rerenders)
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const transportRef = useRef<SignalingTransport | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [dataChannelState, setDataChannelState] = useState<DataChannelState>('closed');

  // Fan-out handler registries
  const signalingHandlers = useRef<((msg: SignalingMessage) => void)[]>([]);
  const dataChannelHandlers = useRef<((msg: any) => void)[]>([]);

  const wasOfflineRef = useRef(false);
  const isOfflineRef = useRef(false);

  // Last fatal error encountered anywhere in the stack
  const [error, setError] = useState<string | null>(null);

  // Specified error block
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const setErrorState = useCallback((message: string, rawMessage?: string | null) => {
    const normalizedMessage = message || null;
    setError(normalizedMessage);
    setErrorDetails(normalizedMessage ? (rawMessage ?? message) : null);
  }, []);

  // Thin wrapper to centralize signaling send
  const sendSignalingMessage = useCallback(
    (msg: SignalingMessage) => {
      try {
        transportRef.current?.send(msg);
      } catch (err: any) {
        setErrorState(err.message || 'Failed to send signaling message', err?.cause?.toString?.());
      }
    },
    [setErrorState]
  );

  // Allow external subscribers to observe raw signaling traffic
  const onSignalingMessage = useCallback((handler: (msg: SignalingMessage) => void) => {
    signalingHandlers.current.push(handler);
    return () => {
      signalingHandlers.current = signalingHandlers.current.filter((cb) => cb !== handler);
    };
  }, []);

  // Core signaling message dispatcher
  const handleSignalingMessage = useCallback(
    async (msg: SignalingMessage) => {
      try {
        if (msg.type === MessageType.WELCOME) {
          // Server-assigned client identifier
          setClientId(msg.client_id);
          console.log('Received client ID:', msg.client_id);
        } else if (msg.type === MessageType.ANSWER) {
          // Remote SDP answer completes offer/answer handshake
          const pc = pcRef.current;
          if (!pc) {
            console.error('No peer connection available for answer');
            return;
          }

          const sdpMsg = msg as SDPMessage;
          console.log('Received answer, setting remote description');

          await pc.setRemoteDescription({
            type: sdpMsg.sdpType as RTCSdpType,
            sdp: sdpMsg.sdp,
          });

          console.log('Remote description set successfully');
        } else if (msg.type === MessageType.ICE_CANDIDATE) {
          // Trickle ICE candidate from remote peer
          const pc = pcRef.current;
          if (!pc) {
            console.error('No peer connection available for ICE candidate');
            return;
          }

          const iceMsg = msg as ICECandidateMessage;

          if (iceMsg.candidate) {
            await pc.addIceCandidate({
              candidate: iceMsg.candidate.candidate,
              sdpMid: iceMsg.candidate.sdpMid,
              sdpMLineIndex: iceMsg.candidate.sdpMLineIndex,
            });
            console.log('Added ICE candidate');
          }
        }
      } catch (err: any) {
        console.error('Error handling signaling message:', err);
        setErrorState(`Signaling error: ${err.message}`, err?.cause?.toString?.());
      }

      signalingHandlers.current.forEach((cb) => cb(msg));
    },
    [setErrorState]
  );

  // Serialize and send JSON messages over the RTCDataChannel
  const sendDataMessage = useCallback(
    (msg: any) => {
      try {
        const channel = dataChannelRef.current;
        if (!channel || channel.readyState !== 'open') return;
        channel.send(JSON.stringify(msg));
      } catch (err: any) {
        setErrorState(err.message || 'Failed to send data message', err?.cause?.toString?.());
      }
    },
    [setErrorState]
  );

  // Allow external subscribers to observe raw data channel traffic
  const onDataMessage = useCallback((handler: (msg: any) => void) => {
    dataChannelHandlers.current.push(handler);
    return () => {
      dataChannelHandlers.current = dataChannelHandlers.current.filter((cb) => cb !== handler);
    };
  }, []);

  // Core data channel message dispatcher
  const handleDataMessage = useCallback(
    async (msg: any) => {
      try {
        dataChannelHandlers.current.forEach((cb) => cb(msg));
      } catch (err: any) {
        console.error('Error handling data message:', err);
        setErrorState(`Data error: ${err.message}`, err?.cause?.toString?.());
      }
    },
    [setErrorState]
  );

  /**
   * Initializes WebSocket-based signaling.
   * Must complete before SDP offer is sent.
   */
  const initTransport = useCallback(async () => {
    const transport = new WebSocketTransport(url);
    transport.onMessage(handleSignalingMessage);
    transportRef.current = transport;
    await transport.connect();
    console.log('WebSocket transport connected');
    return transport;
  }, [url, handleSignalingMessage]);

  /**
   * Creates an ordered, reliable data channel.
   * This is established before the offer so it is negotiated as part of the initial SDP exchange.
   */
  const initDataChannel = useCallback(
    (pc: RTCPeerConnection) => {
      const channel = pc.createDataChannel('data', { ordered: true });
      dataChannelRef.current = channel;
      setDataChannelState(channel.readyState as DataChannelState);

      // @ts-ignore
      channel.onopen = () => {
        console.log('Data channel opened');
        setDataChannelState('open');
        // maybe send initial handshake or keepalive
      };

      // @ts-ignore
      channel.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleDataMessage(msg);
      };

      // @ts-ignore
      channel.onclose = () => {
        console.log('Data channel closed');
        setDataChannelState('closed');
      };

      // @ts-ignore
      channel.onerror = (err) => {
        console.error('Data channel error:', err);
        setDataChannelState(channel.readyState as DataChannelState);
      };

      return channel;
    },
    [handleDataMessage]
  );

  /**
   * Constructs and wires a new RTCPeerConnection instance.
   */
  const initPeerConnection = useCallback(
    (rtcConfig: RTCConfiguration): RTCPeerConnection => {
      const pc = new RTCPeerConnection(rtcConfig);

      // Emit local ICE candidates as they are discovered
      // @ts-ignore
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Generated ICE candidate:', event.candidate.candidate);
          const msg: ICECandidateMessage = {
            type: MessageType.ICE_CANDIDATE,
            candidate: {
              candidate: event.candidate.toJSON().candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
            },
          };
          sendSignalingMessage(msg);
        } else {
          console.log('ICE gathering complete');
        }
      };

      // Track high-level connection state
      // @ts-ignore
      pc.onconnectionstatechange = () => {
        console.log('Connection state changed to:', pc.connectionState);
        setConnectionStatus(pc.connectionState);

        if (pc.connectionState === 'failed') {
          setErrorState('WebRTC connection failed');
        }
      };

      // @ts-ignore
      pc.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.iceConnectionState);
      };

      // @ts-ignore
      pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', pc.iceGatheringState);
      };

      pcRef.current = pc;
      return pc;
    },
    [sendSignalingMessage]
  );

  const replaceOutgoingTracks = useCallback((nextStream: MediaStream | null) => {
    const pc = pcRef.current;
    if (!pc) return;
    if (!nextStream) return;

    const senders = pc.getSenders();

    nextStream.getTracks().forEach((track) => {
      const sender = senders.find((s) => s.track?.kind === track.kind);
      if (sender) {
        try {
          sender.replaceTrack(track);
        } catch (err) {
          console.warn('Failed to replace sender track', err);
        }
        return;
      }
      pc.addTrack(track, nextStream);
    });
  }, []);

  useEffect(() => {
    if (!pcRef.current) return;
    replaceOutgoingTracks(stream);
  }, [stream, replaceOutgoingTracks]);

  /**
   * Main entry point.
   * Starts full WebRTC negotiation.
   */
  const startConnection = useCallback(async () => {
    try {
      if (isOfflineRef.current) {
        setConnectionStatus('closed');
        setErrorState(mapNetworkErrorMessage('no internet'), 'No internet connection');
        return;
      }
      // Ensure a media stream is available
      if (!stream) {
        setConnectionStatus('closed');
        setErrorState('No media stream available');
        return;
      }

      // Reset status and error
      setErrorState('');
      setConnectionStatus('connecting');

      // Initialize signaling transport first
      await initTransport();

      if (isOfflineRef.current) {
        cleanup();
        setConnectionStatus('closed');
        setErrorState(mapNetworkErrorMessage('no internet'), 'No internet connection');
        return;
      }

      const rtcConfig: RTCConfiguration = {
        ...(await fetchIceServers({ apiBaseUrl: settings.apiBaseUrl })),
      };

      // Create peer connection
      const pc = initPeerConnection(rtcConfig);

      // Create data channel
      initDataChannel(pc);

      // Attach all local tracks before creating offer
      stream.getTracks().forEach((track) => {
        console.log(`Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, stream);
      });

      // Create an offer
      console.log('Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await pc.setLocalDescription(offer);

      // Send the offer
      console.log('Sending offer...');
      const msg: SDPMessage = {
        type: MessageType.OFFER,
        sdp: offer.sdp ?? '',
        sdpType: offer.type,
      };
      sendSignalingMessage(msg);

      console.log('Offer sent, waiting for answer...');
    } catch (err: any) {
      console.error('Connection error:', err);
      const raw = String(err?.cause ?? err ?? '');

      const friendly = mapNetworkErrorMessage(raw);
      setErrorState(friendly, raw);
      setConnectionStatus('closed');
    }
  }, [
    stream,
    url,
    initPeerConnection,
    initTransport,
    initDataChannel,
    sendSignalingMessage,
    setErrorState,
    settings.apiBaseUrl,
  ]);

  /**
   * Full teardown.
   * Safe to call multiple times.
   */
  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC connection...');

    transportRef.current?.disconnect();
    transportRef.current = null;

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }

    setConnectionStatus('closed');
    setClientId(null);
    setErrorState('');
    setDataChannelState('closed');
  }, [setErrorState]);

  const transportStatus: TransportStatus = transportRef.current?.status ?? 'closed';

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offlineNow = state.isConnected === false || state.isInternetReachable === false;

      isOfflineRef.current = offlineNow;

      // Only run teardown + error once per offline transition
      if (offlineNow && !wasOfflineRef.current) {
        wasOfflineRef.current = true;

        setConnectionStatus('closed');
        setErrorState(mapNetworkErrorMessage('no internet'), 'No internet connection');

        transportRef.current?.disconnect();
        transportRef.current = null;

        const pc = pcRef.current;
        if (pc) {
          pc.close();
        }
      }

      // Reset transition flag when back online
      if (!offlineNow && wasOfflineRef.current) {
        wasOfflineRef.current = false;
      }
    });

    return () => unsubscribe();
  }, [setErrorState]);

  // Clean up existing connection if URL changes to ensure fresh connection with new URL
  useEffect(() => {
    const hasActiveTransport =
      !!transportRef.current || !!pcRef.current || !!dataChannelRef.current;
    if (!hasActiveTransport) return;

    console.log('URL changed, cleaning up existing connection');
    cleanup();
  }, [url, cleanup]);

  return {
    transportStatus,
    connectionStatus,
    dataChannelState,
    clientId,
    error,
    errorDetails,
    startConnection,
    cleanup,
    sendSignalingMessage,
    onSignalingMessage,
    sendDataMessage,
    onDataMessage,
  };
};

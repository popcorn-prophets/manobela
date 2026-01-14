import {
  ICECandidateMessage,
  MessageType,
  SDPMessage,
  SignalingMessage,
  SignalingTransport,
  TransportStatus,
} from '@/types/webrtc';
import { useCallback, useRef, useState } from 'react';
import { MediaStream, RTCPeerConnection } from 'react-native-webrtc';
import { WebSocketTransport } from '@/services/signaling/web-socket-transport';
import RTCDataChannel from 'react-native-webrtc/lib/typescript/RTCDataChannel';
import { fetchIceServers } from '@/services/ice-servers';

interface UseWebRTCProps {
  // WebSocket signaling endpoint
  url: string;

  // Local media stream (camera)
  stream: MediaStream | null;

  // Optional override for RTC configuration
  rtcConfig?: RTCConfiguration;
}

interface UseWebRTCReturn {
  transportStatus: TransportStatus;
  connectionStatus: RTCPeerConnectionState;
  clientId: string | null;
  error: string | null;

  // Starts signaling + peer connection negotiation
  startConnection: () => void;

  // Tears down transport, peer connection, and channels
  cleanup: () => void;

  // Low-level escape hatches
  sendSignalingMessage: (msg: SignalingMessage) => void;
  onSignalingMessage: (handler: (msg: SignalingMessage) => void) => void;
  sendDataMessage: (msg: any) => void;
  onDataMessage: (handler: (msg: any) => void) => void;
}

/**
 * Manages WebRTC peer connection, signaling, and data channel lifecycle.
 */
export const useWebRTC = ({ url, stream }: UseWebRTCProps): UseWebRTCReturn => {
  // Assigned by signaling server on WELCOME
  const [clientId, setClientId] = useState<string | null>(null);

  // Mirrors RTCPeerConnection.connectionState
  const [connectionStatus, setConnectionStatus] = useState<RTCPeerConnectionState>('new');

  // Long-lived mutable references (never trigger rerenders)
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const transportRef = useRef<SignalingTransport | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Fan-out handler registries
  const signalingHandlers = useRef<((msg: SignalingMessage) => void)[]>([]);
  const dataChannelHandlers = useRef<((msg: any) => void)[]>([]);

  // Last fatal error encountered anywhere in the stack
  const [error, setError] = useState<string | null>(null);

  // Thin wrapper to centralize signaling send
  const sendSignalingMessage = useCallback((msg: SignalingMessage) => {
    try {
      transportRef.current?.send(msg);
    } catch (err: any) {
      setError(err.message || 'Failed to send signaling message');
    }
  }, []);

  // Allow external subscribers to observe raw signaling traffic
  const onSignalingMessage = useCallback((handler: (msg: SignalingMessage) => void) => {
    signalingHandlers.current.push(handler);
  }, []);

  // Core signaling message dispatcher
  const handleSignalingMessage = useCallback(async (msg: SignalingMessage) => {
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
      setError(`Signaling error: ${err.message}`);
    }

    signalingHandlers.current.forEach((cb) => cb(msg));
  }, []);

  // Serialize and send JSON messages over the RTCDataChannel
  const sendDataMessage = useCallback((msg: any) => {
    try {
      dataChannelRef.current?.send(JSON.stringify(msg));
    } catch (err: any) {
      setError(err.message || 'Failed to send data message');
    }
  }, []);

  // Allow external subscribers to observe raw data channel traffic
  const onDataMessage = useCallback((handler: (msg: any) => void) => {
    dataChannelHandlers.current.push(handler);
  }, []);

  // Core data channel message dispatcher
  const handleDataMessage = useCallback(async (msg: any) => {
    try {
      dataChannelHandlers.current.forEach((cb) => cb(msg));
    } catch (err: any) {
      console.error('Error handling data message:', err);
      setError(`Data error: ${err.message}`);
    }
  }, []);

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

      // @ts-ignore
      channel.onopen = () => {
        console.log('Data channel opened');
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
      };

      // @ts-ignore
      channel.onerror = (err) => {
        console.error('Data channel error:', err);
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
          setError('WebRTC connection failed');
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

  /**
   * Main entry point.
   * Starts full WebRTC negotiation.
   */
  const startConnection = useCallback(async () => {
    try {
      // Ensure a media stream is available
      if (!stream) {
        setError('No media stream available');
        return;
      }

      // Reset status and error
      setError('');
      setConnectionStatus('connecting');
      console.log('Starting WebRTC connection...');

      // Initialize signaling transport first
      await initTransport();

      const rtcConfig: RTCConfiguration = {
        ...(await fetchIceServers()),
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
        sdp: offer.sdp!,
        sdpType: offer.type,
      };
      sendSignalingMessage(msg);

      console.log('Offer sent, waiting for answer...');
    } catch (err: any) {
      console.error('Connection error:', err);
      setError(`Connection error: ${err.message}`);
      setConnectionStatus('failed');
    }
  }, [stream, initPeerConnection, initTransport, initDataChannel, sendSignalingMessage]);

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

    setConnectionStatus('closed');
    setClientId(null);
    setError('');
  }, []);

  const transportStatus: TransportStatus = transportRef.current?.status ?? 'closed';

  return {
    transportStatus,
    connectionStatus,
    clientId,
    error,
    startConnection,
    cleanup,
    sendSignalingMessage,
    onSignalingMessage,
    sendDataMessage,
    onDataMessage,
  };
};

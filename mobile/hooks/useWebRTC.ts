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

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

interface UseWebRTCProps {
  url: string;
  stream: MediaStream | null;
  rtcConfig?: RTCConfiguration;
}

interface UseWebRTCReturn {
  transportStatus: TransportStatus;
  connectionStatus: RTCPeerConnectionState;
  clientId: string | null;
  error: string | null;
  startConnection: () => void;
  cleanup: () => void;
  sendSignalingMessage: (msg: SignalingMessage) => void;
  onSignalingMessage: (handler: (msg: SignalingMessage) => void) => void;
  sendDataMessage: (msg: any) => void;
  onDataMessage: (handler: (msg: any) => void) => void;
}

export const useWebRTC = ({
  url,
  stream,
  rtcConfig = DEFAULT_RTC_CONFIG,
}: UseWebRTCProps): UseWebRTCReturn => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<RTCPeerConnectionState>('new');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const transportRef = useRef<SignalingTransport | null>(null);
  const signalingHandlers = useRef<((msg: SignalingMessage) => void)[]>([]);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const dataChannelHandlers = useRef<((msg: any) => void)[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sendSignalingMessage = useCallback((msg: SignalingMessage) => {
    try {
      transportRef.current?.send(msg);
    } catch (err: any) {
      setError(err.message || 'Failed to send signaling message');
    }
  }, []);

  const onSignalingMessage = useCallback((handler: (msg: SignalingMessage) => void) => {
    signalingHandlers.current.push(handler);
  }, []);

  const handleSignalingMessage = useCallback(async (msg: SignalingMessage) => {
    try {
      if (msg.type === MessageType.WELCOME) {
        setClientId(msg.client_id);
        console.log('Received client ID:', msg.client_id);
      } else if (msg.type === MessageType.ANSWER) {
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

  const sendDataMessage = useCallback((msg: any) => {
    try {
      dataChannelRef.current?.send(JSON.stringify(msg));
    } catch (err: any) {
      setError(err.message || 'Failed to send data message');
    }
  }, []);

  const onDataMessage = useCallback((handler: (msg: any) => void) => {
    dataChannelHandlers.current.push(handler);
  }, []);

  const handleDataMessage = useCallback(async (msg: any) => {
    try {
      dataChannelHandlers.current.forEach((cb) => cb(msg));
    } catch (err: any) {
      console.error('Error handling data message:', err);
      setError(`Data error: ${err.message}`);
    }
  }, []);

  const initTransport = useCallback(async () => {
    const transport = new WebSocketTransport(url);
    transport.onMessage(handleSignalingMessage);
    transportRef.current = transport;
    await transport.connect();
    console.log('WebSocket transport connected');
    return transport;
  }, [url, handleSignalingMessage]);

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

  const initPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection(rtcConfig);

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
  }, [sendSignalingMessage, rtcConfig]);

  const startConnection = useCallback(async () => {
    try {
      if (!stream) {
        setError('No media stream available');
        return;
      }

      setError('');
      setConnectionStatus('connecting');
      console.log('Starting WebRTC connection...');

      await initTransport();

      const pc = initPeerConnection();

      initDataChannel(pc);

      stream.getTracks().forEach((track) => {
        console.log(`Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, stream);
      });

      console.log('Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await pc.setLocalDescription(offer);
      console.log('Local description set, sending offer...');

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

export enum MessageType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
  WELCOME = 'welcome',
  ERROR = 'error',
}

export interface SDPMessage {
  type: MessageType.OFFER | MessageType.ANSWER;
  sdp: string;
  sdpType: 'offer' | 'answer';
}

export interface ICECandidatePayload {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

export interface ICECandidateMessage {
  type: MessageType.ICE_CANDIDATE;
  candidate: ICECandidatePayload;
}

export interface WelcomeMessage {
  type: MessageType.WELCOME;
  client_id: string;
  timestamp: string;
}

export interface ErrorMessage {
  type: MessageType.ERROR;
  message: string;
}

export type SignalingMessage = SDPMessage | ICECandidateMessage | WelcomeMessage | ErrorMessage;

export type TransportStatus = 'connecting' | 'open' | 'closing' | 'closed';

export interface SignalingTransport {
  status: TransportStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (msg: SignalingMessage) => void;
  onMessage: (handler: (msg: SignalingMessage) => void) => void;
}

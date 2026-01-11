import { SignalingMessage, SignalingTransport, TransportStatus } from '@/types/webrtc';

export class WebSocketTransport implements SignalingTransport {
  public status: TransportStatus = 'closed';
  private ws: WebSocket | null = null;
  private handlers: ((msg: SignalingMessage) => void)[] = [];

  constructor(private url: string) {}

  connect(): Promise<void> {
    if (this.ws) return Promise.resolve();

    this.status = 'connecting';
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);

      ws.onopen = () => {
        this.status = 'open';
        this.ws = ws;
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as SignalingMessage;
          this.handlers.forEach((cb) => cb(msg));
        } catch (err) {
          console.error('Failed to parse signaling message:', err);
        }
      };

      ws.onerror = (e: any) => {
        const message = e?.message || 'Unknown WebSocket error';
        console.error('WebSocket error:', message);
        this.status = 'closed';
        reject(new Error(`WebSocket error: ${message}`));
      };

      ws.onclose = () => {
        this.status = 'closed';
        this.ws = null;
      };
    });
  }

  send(msg: SignalingMessage) {
    if (this.status !== 'open' || !this.ws) {
      throw new Error('WebSocket is not open');
    }
    this.ws.send(JSON.stringify(msg));
  }

  onMessage(handler: (msg: SignalingMessage) => void) {
    this.handlers.push(handler);
  }

  disconnect() {
    if (!this.ws) return;

    this.status = 'closing';

    this.ws.onerror = null;
    this.ws.onclose = null;
    this.ws.onmessage = null;

    this.ws.close();
    this.ws = null;
    this.status = 'closed';
  }
}

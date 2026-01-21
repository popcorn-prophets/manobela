import { SignalingMessage, SignalingTransport, TransportStatus } from '@/types/webrtc';

/**
 * WebSocket-based implementation of the signaling transport.
 */
export class WebSocketTransport implements SignalingTransport {
  // Current lifecycle status
  public status: TransportStatus = 'closed';

  // WebSocket instance
  private ws: WebSocket | null = null;

  // Registered listeners
  private handlers: ((msg: SignalingMessage) => void)[] = [];

  constructor(private url: string) {}

  /**
   * Opens the WebSocket connection.
   * Resolves once the connection is established.
   * Subsequent calls are no-ops if already connected.
   */
  connect(): Promise<void> {
    // Already connected, does nothing
    if (this.ws) return Promise.resolve();

    this.status = 'connecting';

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);

      // Establish connection
      ws.onopen = () => {
        this.status = 'open';
        this.ws = ws;
        resolve();
      };

      // Parse incoming messages and forward them to listeners
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as SignalingMessage;
          this.handlers.forEach((cb) => cb(msg));
        } catch (err) {
          console.error('Failed to parse signaling message:', err);
        }
      };

      // Connection-level error (usually fatal)
      ws.onerror = (e: any) => {
        const rawMessage =
          e?.message || e?.error?.message || e?.error?.toString?.() || e?.type || '';
        const normalized = rawMessage.toLowerCase().trim();
        const friendlyMessage =
          !rawMessage ||
          rawMessage === 'Unknown WebSocket error' ||
          normalized === 'error' ||
          normalized.includes('econnrefused') ||
          normalized.includes('enotfound') ||
          normalized.includes('eai_again') ||
          normalized.includes('host not found')
            ? 'Unable to reach the signaling server. Please check your connection or try again later.'
            : rawMessage;

        console.error('WebSocket error:', e);
        this.status = 'closed';
        reject(new Error(friendlyMessage));
      };

      // Remote or local close
      ws.onclose = () => {
        this.status = 'closed';
        this.ws = null;
      };
    });
  }

  /**
   * Sends a signaling message over the socket.
   * Throws if the socket is not currently open.
   */
  send(msg: SignalingMessage) {
    if (this.status !== 'open' || !this.ws) {
      throw new Error('WebSocket is not open');
    }
    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Registers a handler for incoming signaling messages.
   * Handlers are invoked in the order they are added.
   */
  onMessage(handler: (msg: SignalingMessage) => void) {
    this.handlers.push(handler);
  }

  /**
   * Closes the WebSocket connection and clears internal state.
   * Event handlers are removed to avoid callbacks during teardown.
   */
  disconnect() {
    if (!this.ws) return;

    this.status = 'closing';

    // Prevent callbacks during teardown
    this.ws.onerror = null;
    this.ws.onclose = null;
    this.ws.onmessage = null;

    this.ws.close();
    this.ws = null;

    this.status = 'closed';
  }
}

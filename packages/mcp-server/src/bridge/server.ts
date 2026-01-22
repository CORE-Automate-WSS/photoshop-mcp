/**
 * Photoshop Bridge Server
 *
 * WebSocket server that accepts connections from the UXP plugin running in Photoshop.
 * This is the preferred mode - the MCP server runs the WebSocket server,
 * and the UXP plugin connects to it.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from '../logging/logger.js';

const logger = new Logger('bridge-server');

export interface BridgeRequest {
  id: string;
  command: string;
  params: Record<string, unknown>;
}

export interface BridgeResponse {
  id: string;
  ok: boolean;
  changed: boolean;
  data?: unknown;
  artifacts?: {
    layerIds?: number[];
    selectionRef?: string;
  };
  warnings?: string[];
  error?: string;
}

export interface ToolResponse {
  ok: boolean;
  changed: boolean;
  data?: unknown;
  artifacts?: {
    layerIds?: number[];
    selectionRef?: string;
  };
  warnings?: string[];
  error?: string;
}

export class PhotoshopBridgeServer {
  private wss: WebSocketServer | null = null;
  private client: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (response: BridgeResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  async start(port: number = 8765): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port });

        this.wss.on('listening', () => {
          logger.info(`WebSocket server listening on port ${port}`);
          resolve();
        });

        this.wss.on('connection', (ws) => {
          logger.info('UXP plugin connected');

          // Only allow one client at a time
          if (this.client) {
            logger.warn('Replacing existing client connection');
            this.client.close();
          }

          this.client = ws;

          ws.on('message', (data) => {
            this.handleMessage(data.toString());
          });

          ws.on('close', () => {
            logger.info('UXP plugin disconnected');
            if (this.client === ws) {
              this.client = null;
              this.rejectAllPending(new Error('Connection closed'));
            }
          });

          ws.on('error', (error) => {
            logger.error('WebSocket client error', { error: error.message });
          });
        });

        this.wss.on('error', (error) => {
          logger.error('WebSocket server error', { error: error.message });
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN;
  }

  async send(command: string, params: Record<string, unknown> = {}): Promise<ToolResponse> {
    if (!this.client || this.client.readyState !== WebSocket.OPEN) {
      throw new Error('No UXP plugin connected');
    }

    const id = `req_${++this.requestId}`;
    const request: BridgeRequest = { id, command, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${command}`));
      }, this.REQUEST_TIMEOUT);

      this.pendingRequests.set(id, {
        resolve: (response) => {
          resolve({
            ok: response.ok,
            changed: response.changed,
            data: response.data,
            artifacts: response.artifacts,
            warnings: response.warnings,
            error: response.error,
          });
        },
        reject,
        timeout
      });

      this.client!.send(JSON.stringify(request));
      logger.debug('Sent request', { id, command });
    });
  }

  private handleMessage(data: string): void {
    try {
      const response: BridgeResponse = JSON.parse(data);

      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(response.id);
        pending.resolve(response);
      } else {
        logger.warn('Received response for unknown request', { id: response.id });
      }
    } catch (error) {
      logger.error('Failed to parse message', { data, error });
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

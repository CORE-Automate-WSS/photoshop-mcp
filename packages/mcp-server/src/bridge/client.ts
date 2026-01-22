/**
 * Photoshop Bridge Client
 *
 * WebSocket client that communicates with the UXP plugin running in Photoshop.
 */

import WebSocket from 'ws';
import { Logger } from '../logging/logger.js';

const logger = new Logger('bridge-client');

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

export class PhotoshopBridge {
  private ws: WebSocket | null = null;
  private connected = false;
  private requestId = 0;
  private pendingRequests = new Map<string, {
    resolve: (response: BridgeResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      const connectionTimeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error('Connection timeout'));
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.connected = true;
        logger.info('WebSocket connected');
        resolve();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        this.connected = false;
        logger.info('WebSocket disconnected');
        this.rejectAllPending(new Error('Connection closed'));
      });

      this.ws.on('error', (error) => {
        clearTimeout(connectionTimeout);
        logger.error('WebSocket error', { error: error.message });
        reject(error);
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async send(command: string, params: Record<string, unknown> = {}): Promise<ToolResponse> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to Photoshop bridge');
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

      this.ws!.send(JSON.stringify(request));
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
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

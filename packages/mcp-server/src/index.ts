#!/usr/bin/env node
/**
 * Photoshop MCP Server
 *
 * Exposes Photoshop editing tools via the Model Context Protocol.
 * Runs a WebSocket server that the UXP plugin connects to.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { PhotoshopBridgeServer } from "./bridge/server.js";
import { createToolRegistry, type ToolRegistry } from "./tools/registry.js";
import { Logger } from "./logging/logger.js";

const logger = new Logger("photoshop-mcp");

interface BridgeInterface {
  isConnected(): boolean;
  send(
    command: string,
    params?: Record<string, unknown>,
  ): Promise<{
    ok: boolean;
    changed: boolean;
    data?: unknown;
    artifacts?: { layerIds?: number[]; selectionRef?: string };
    warnings?: string[];
    error?: string;
  }>;
}

class PhotoshopMCPServer {
  private server: Server;
  private bridge: PhotoshopBridgeServer;
  private toolRegistry: ToolRegistry;

  constructor() {
    this.server = new Server(
      {
        name: "photoshop-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.bridge = new PhotoshopBridgeServer();
    this.toolRegistry = createToolRegistry(this.bridge as BridgeInterface);

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = this.toolRegistry.listTools();
      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      logger.info(`Tool call: ${name}`, { args });

      try {
        const result = await this.toolRegistry.callTool(name, args ?? {});

        logger.info(`Tool result: ${name}`, {
          ok: result.ok,
          changed: result.changed,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Tool error: ${name}`, { error: errorMessage });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ok: false,
                  changed: false,
                  error: errorMessage,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logger.error("Server error", { error });
    };

    process.on("SIGINT", async () => {
      logger.info("Shutting down...");
      await this.bridge.stop();
      await this.server.close();
      process.exit(0);
    });
  }

  async run(): Promise<void> {
    const wsPort = parseInt(process.env.PS_BRIDGE_PORT ?? "8765", 10);

    logger.info("Starting Photoshop MCP Server");

    // Start WebSocket server for UXP plugin to connect to
    // Non-fatal: MCP server continues even if WebSocket fails
    try {
      await this.bridge.start(wsPort);
      logger.info(`WebSocket server running on ws://localhost:${wsPort}`);
    } catch (error) {
      logger.warn(
        "WebSocket server failed to start - will retry or tools will fail until Photoshop connects",
        {
          error: error instanceof Error ? error.message : String(error),
          port: wsPort,
        },
      );
      // Don't exit - continue with MCP server so tools are registered with Claude
      // Tool calls will fail gracefully until UXP plugin connects
    }

    // Start MCP server on stdio
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    logger.info("MCP Server running on stdio");
  }
}

// Main entry point
const server = new PhotoshopMCPServer();
server.run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

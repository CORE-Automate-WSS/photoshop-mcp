/**
 * App Tools
 *
 * Tools for querying Photoshop application state.
 */

import type {
  ToolDefinition,
  PhotoshopBridge,
  ToolResponse,
} from "./registry.js";

export const appTools: ToolDefinition[] = [
  {
    name: "ps_app_get_info",
    description:
      "Get Photoshop application information including version and platform",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge: PhotoshopBridge): Promise<ToolResponse> => {
      return bridge.send("app.get_info", {});
    },
  },

  {
    name: "ps_echo",
    description:
      "Echo test tool for verifying MCP connection (does not require Photoshop)",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "Message to echo back",
        },
      },
      required: ["message"],
    },
    handler: async (
      _bridge: PhotoshopBridge,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> => {
      return {
        ok: true,
        changed: false,
        data: {
          echo: args.message,
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
];

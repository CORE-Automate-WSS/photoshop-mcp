/**
 * Tool Registry
 *
 * Central registry for all Photoshop MCP tools.
 * Handles tool discovery, validation, and dispatch.
 */

import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { appTools } from "./app.js";
import { documentTools } from "./document.js";
import { layerTools } from "./layer.js";
import { selectionTools } from "./selection.js";
import { adjustmentTools } from "./adjustment.js";
import { historyTools } from "./history.js";
import { filterTools } from "./filter.js";
import { transformTools } from "./transform.js";
import { textTools } from "./text.js";
import { utilityTools } from "./utility.js";

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

export interface PhotoshopBridge {
  isConnected(): boolean;
  send(
    command: string,
    params?: Record<string, unknown>,
  ): Promise<ToolResponse>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, object>;
    required?: string[];
  };
  handler: (
    bridge: PhotoshopBridge,
    args: Record<string, unknown>,
  ) => Promise<ToolResponse>;
}

export interface ToolRegistry {
  listTools(): Tool[];
  callTool(name: string, args: Record<string, unknown>): Promise<ToolResponse>;
}

export function createToolRegistry(bridge: PhotoshopBridge): ToolRegistry {
  const tools = new Map<string, ToolDefinition>();

  // Register all tool modules
  const allTools = [...appTools, ...documentTools, ...layerTools, ...selectionTools, ...adjustmentTools, ...historyTools, ...filterTools, ...transformTools, ...textTools, ...utilityTools];

  for (const tool of allTools) {
    tools.set(tool.name, tool);
  }

  return {
    listTools(): Tool[] {
      return Array.from(tools.values()).map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    },

    async callTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> {
      const tool = tools.get(name);

      if (!tool) {
        return {
          ok: false,
          changed: false,
          error: `Unknown tool: ${name}`,
        };
      }

      // Check bridge connection for tools that need it
      if (!name.startsWith("ps_echo") && !bridge.isConnected()) {
        return {
          ok: false,
          changed: false,
          error:
            "Not connected to Photoshop. Please ensure the UXP plugin is running.",
        };
      }

      return tool.handler(bridge, args);
    },
  };
}

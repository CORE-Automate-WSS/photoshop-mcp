/**
 * App Tools
 *
 * Tools for querying Photoshop application state.
 * Uses Zod validation for type-safe parameter handling.
 */

import { createSimpleTool, z } from "./factory.js";
import type { ToolDefinition, ToolResponse } from "./registry.js";

// Schemas
const echoSchema = z.object({
  message: z.string().describe("Message to echo back"),
});

// Tools
export const appTools: ToolDefinition[] = [
  createSimpleTool(
    "ps_app_get_info",
    "Get Photoshop application information including version and platform",
    "app.get_info"
  ),

  // Echo tool is special - doesn't require bridge connection
  {
    name: "ps_echo",
    description:
      "Echo test tool for verifying MCP connection (does not require Photoshop)",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Message to echo back" },
      },
      required: ["message"],
    },
    handler: async (_bridge, args): Promise<ToolResponse> => {
      const result = echoSchema.safeParse(args);
      if (!result.success) {
        return {
          ok: false,
          changed: false,
          error: `Validation failed: ${result.error.message}`,
        };
      }
      return {
        ok: true,
        changed: false,
        data: {
          echo: result.data.message,
          timestamp: new Date().toISOString(),
        },
      };
    },
  },
];

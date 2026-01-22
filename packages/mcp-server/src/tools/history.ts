/**
 * History Tools
 *
 * Tools for undo/redo and snapshot management.
 * Uses Zod validation for type-safe parameter handling.
 */

import { createTool, createSimpleTool, z } from "./factory.js";
import type { ToolDefinition, ToolResponse } from "./registry.js";

// Schemas
const stepsSchema = z.object({
  steps: z
    .number()
    .min(1)
    .default(1)
    .describe("Number of history states to step"),
});

const snapshotSchema = z.object({
  name: z.string().default("Snapshot").describe("Name for the snapshot"),
  fullDocument: z
    .boolean()
    .default(true)
    .describe("Capture full document (true) or merged layers (false)"),
});

const gotoStateSchema = z.object({
  name: z.string().optional().describe("Name of the history state to go to"),
  index: z
    .number()
    .optional()
    .describe("Index of the history state to go to (1-based)"),
});

// Tools
export const historyTools: ToolDefinition[] = [
  createSimpleTool(
    "ps_history_undo",
    "Undo the last action in the document",
    "history.undo"
  ),

  createSimpleTool(
    "ps_history_redo",
    "Redo the last undone action in the document",
    "history.redo"
  ),

  createTool(
    "ps_history_step_backward",
    "Step backward in history by a specified number of states",
    stepsSchema,
    "history.step_backward"
  ),

  createTool(
    "ps_history_step_forward",
    "Step forward in history by a specified number of states",
    stepsSchema,
    "history.step_forward"
  ),

  createTool(
    "ps_history_snapshot_create",
    "Create a snapshot of the current document state",
    snapshotSchema,
    "history.snapshot_create"
  ),

  // Special handling for goto_state - needs validation that at least one param is provided
  {
    name: "ps_history_goto_state",
    description: "Go to a specific history state by name or index",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the history state" },
        index: { type: "number", description: "Index of the history state (1-based)" },
      },
    },
    handler: async (bridge, args): Promise<ToolResponse> => {
      const result = gotoStateSchema.safeParse(args);
      if (!result.success) {
        return {
          ok: false,
          changed: false,
          error: `Validation failed: ${result.error.message}`,
        };
      }
      const { name, index } = result.data;
      if (!name && !index) {
        return {
          ok: false,
          changed: false,
          error: "Either name or index must be provided",
        };
      }
      return bridge.send("history.goto_state", { name, index });
    },
  },

  createSimpleTool(
    "ps_history_clear",
    "Clear all history states (cannot be undone)",
    "history.clear"
  ),

  createSimpleTool(
    "ps_history_get_states",
    "Get a list of current history states",
    "history.get_states"
  ),
];

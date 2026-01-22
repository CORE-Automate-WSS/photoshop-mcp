import { ToolDefinition } from "./registry.js";

/**
 * History tools for undo/redo and snapshot management
 * These use batchPlay commands since history operations aren't in DOM API
 */
export const historyTools: ToolDefinition[] = [
  {
    name: "ps_history_undo",
    description: "Undo the last action in the document",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("history.undo", {});
    },
  },

  {
    name: "ps_history_redo",
    description: "Redo the last undone action in the document",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("history.redo", {});
    },
  },

  {
    name: "ps_history_step_backward",
    description: "Step backward in history by a specified number of states",
    inputSchema: {
      type: "object",
      properties: {
        steps: {
          type: "number",
          description: "Number of history states to step backward (default: 1)",
          minimum: 1,
        },
      },
    },
    handler: async (bridge, args) => {
      const steps = (args as { steps?: number }).steps ?? 1;
      return bridge.send("history.step_backward", { steps });
    },
  },

  {
    name: "ps_history_step_forward",
    description: "Step forward in history by a specified number of states",
    inputSchema: {
      type: "object",
      properties: {
        steps: {
          type: "number",
          description: "Number of history states to step forward (default: 1)",
          minimum: 1,
        },
      },
    },
    handler: async (bridge, args) => {
      const steps = (args as { steps?: number }).steps ?? 1;
      return bridge.send("history.step_forward", { steps });
    },
  },

  {
    name: "ps_history_snapshot_create",
    description: "Create a snapshot of the current document state",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the snapshot",
        },
        fullDocument: {
          type: "boolean",
          description: "Capture full document (true) or merged layers (false). Default: true",
        },
      },
    },
    handler: async (bridge, args) => {
      const { name, fullDocument } = args as { name?: string; fullDocument?: boolean };
      return bridge.send("history.snapshot_create", {
        name: name || "Snapshot",
        fullDocument: fullDocument !== false,
      });
    },
  },

  {
    name: "ps_history_goto_state",
    description: "Go to a specific history state by name or index",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the history state to go to",
        },
        index: {
          type: "number",
          description: "Index of the history state to go to (1-based)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { name, index } = args as { name?: string; index?: number };
      if (!name && !index) {
        return { ok: false, changed: false, error: "Either name or index must be provided" };
      }
      return bridge.send("history.goto_state", { name, index });
    },
  },

  {
    name: "ps_history_clear",
    description: "Clear all history states (cannot be undone)",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("history.clear", {});
    },
  },

  {
    name: "ps_history_get_states",
    description: "Get a list of current history states",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("history.get_states", {});
    },
  },
];

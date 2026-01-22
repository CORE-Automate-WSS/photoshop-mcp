/**
 * Selection Tools
 *
 * Tools for working with Photoshop selections.
 * Uses DOM API where available, batchPlay for advanced features.
 */

import type {
  ToolDefinition,
  PhotoshopBridge,
  ToolResponse,
} from "./registry.js";

export const selectionTools: ToolDefinition[] = [
  {
    name: "ps_select_subject",
    description: "Automatically select the main subject in the image using AI (Select Subject)",
    inputSchema: {
      type: "object",
      properties: {
        sampleAllLayers: {
          type: "boolean",
          description: "Sample all layers instead of just the active layer (default: false)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("selection.select_subject", {
        sampleAllLayers: args.sampleAllLayers ?? false,
      });
    },
  },


  {
    name: "ps_select_all",
    description: "Select the entire canvas",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge: PhotoshopBridge): Promise<ToolResponse> => {
      return bridge.send("selection.select_all", {});
    },
  },

  {
    name: "ps_select_none",
    description: "Deselect all (clear selection)",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge: PhotoshopBridge): Promise<ToolResponse> => {
      return bridge.send("selection.deselect", {});
    },
  },

  {
    name: "ps_select_inverse",
    description: "Invert the current selection",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge: PhotoshopBridge): Promise<ToolResponse> => {
      return bridge.send("selection.inverse", {});
    },
  },

  {
    name: "ps_select_rectangle",
    description: "Create a rectangular selection",
    inputSchema: {
      type: "object",
      properties: {
        top: {
          type: "number",
          description: "Top edge in pixels",
        },
        left: {
          type: "number",
          description: "Left edge in pixels",
        },
        bottom: {
          type: "number",
          description: "Bottom edge in pixels",
        },
        right: {
          type: "number",
          description: "Right edge in pixels",
        },
        feather: {
          type: "number",
          description: "Feather radius in pixels (optional)",
        },
      },
      required: ["top", "left", "bottom", "right"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("selection.select_rectangle", {
        top: args.top,
        left: args.left,
        bottom: args.bottom,
        right: args.right,
        feather: args.feather ?? 0,
      });
    },
  },

  {
    name: "ps_select_ellipse",
    description: "Create an elliptical selection",
    inputSchema: {
      type: "object",
      properties: {
        top: {
          type: "number",
          description: "Top edge of bounding box in pixels",
        },
        left: {
          type: "number",
          description: "Left edge of bounding box in pixels",
        },
        bottom: {
          type: "number",
          description: "Bottom edge of bounding box in pixels",
        },
        right: {
          type: "number",
          description: "Right edge of bounding box in pixels",
        },
        feather: {
          type: "number",
          description: "Feather radius in pixels (optional)",
        },
      },
      required: ["top", "left", "bottom", "right"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("selection.select_ellipse", {
        top: args.top,
        left: args.left,
        bottom: args.bottom,
        right: args.right,
        feather: args.feather ?? 0,
      });
    },
  },

  {
    name: "ps_selection_expand",
    description: "Expand the current selection by a specified number of pixels",
    inputSchema: {
      type: "object",
      properties: {
        pixels: {
          type: "number",
          description: "Number of pixels to expand",
        },
      },
      required: ["pixels"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("selection.expand", { pixels: args.pixels });
    },
  },

  {
    name: "ps_selection_contract",
    description: "Contract the current selection by a specified number of pixels",
    inputSchema: {
      type: "object",
      properties: {
        pixels: {
          type: "number",
          description: "Number of pixels to contract",
        },
      },
      required: ["pixels"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("selection.contract", { pixels: args.pixels });
    },
  },

  {
    name: "ps_selection_feather",
    description: "Feather the current selection edges",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Feather radius in pixels",
        },
      },
      required: ["radius"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("selection.feather", { radius: args.radius });
    },
  },

  {
    name: "ps_selection_grow",
    description: "Grow selection to include adjacent pixels with similar colors",
    inputSchema: {
      type: "object",
      properties: {
        tolerance: {
          type: "number",
          description: "Color tolerance (0-255)",
        },
      },
      required: ["tolerance"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("selection.grow", { tolerance: args.tolerance });
    },
  },

  {
    name: "ps_selection_get_bounds",
    description: "Get the bounding box of the current selection",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge: PhotoshopBridge): Promise<ToolResponse> => {
      return bridge.send("selection.get_bounds", {});
    },
  },
];

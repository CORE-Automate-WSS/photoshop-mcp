import { ToolDefinition } from "./registry.js";

/**
 * Utility tools - Masks, Document State, Raw BatchPlay, and other utilities
 * Based on Adobe UXP documentation
 */
export const utilityTools: ToolDefinition[] = [
  // ============================================================================
  // Mask Operations
  // ============================================================================
  {
    name: "ps_mask_add_layer_mask",
    description: "Add a layer mask to the active layer. Can create from selection or as reveal/hide all.",
    inputSchema: {
      type: "object",
      properties: {
        maskType: {
          type: "string",
          enum: ["revealAll", "hideAll", "revealSelection", "hideSelection"],
          description: "Type of mask to create",
        },
      },
      required: ["maskType"],
    },
    handler: async (bridge, args) => {
      const { maskType } = args as { maskType: string };
      return bridge.send("mask.add_layer_mask", { maskType });
    },
  },

  {
    name: "ps_mask_delete",
    description: "Delete the layer mask from the active layer",
    inputSchema: {
      type: "object",
      properties: {
        apply: {
          type: "boolean",
          description: "Apply the mask before deleting (true) or discard (false). Default: false",
        },
      },
    },
    handler: async (bridge, args) => {
      const { apply } = args as { apply?: boolean };
      return bridge.send("mask.delete", { apply: apply ?? false });
    },
  },

  {
    name: "ps_mask_enable_disable",
    description: "Enable or disable the layer mask without deleting it",
    inputSchema: {
      type: "object",
      properties: {
        enabled: {
          type: "boolean",
          description: "Enable (true) or disable (false) the mask",
        },
      },
      required: ["enabled"],
    },
    handler: async (bridge, args) => {
      const { enabled } = args as { enabled: boolean };
      return bridge.send("mask.enable_disable", { enabled });
    },
  },

  {
    name: "ps_mask_invert",
    description: "Invert the layer mask on the active layer",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("mask.invert", {});
    },
  },

  {
    name: "ps_mask_load_selection",
    description: "Load the layer mask as a selection",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["replace", "add", "subtract", "intersect"],
          description: "How to combine with existing selection (default: replace)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { operation } = args as { operation?: string };
      return bridge.send("mask.load_selection", { operation: operation || "replace" });
    },
  },

  {
    name: "ps_mask_feather",
    description: "Feather/blur the edges of the layer mask",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Feather radius in pixels",
          minimum: 0.1,
          maximum: 250,
        },
      },
      required: ["radius"],
    },
    handler: async (bridge, args) => {
      const { radius } = args as { radius: number };
      return bridge.send("mask.feather", { radius });
    },
  },

  // ============================================================================
  // Document State / Info
  // ============================================================================
  {
    name: "ps_get_document_info",
    description: "Get comprehensive information about the active document including dimensions, color mode, and layer count",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("doc.get_info", {});
    },
  },

  {
    name: "ps_get_layer_bounds",
    description: "Get the pixel bounds of a layer or the active layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "Layer ID (uses active layer if not specified)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { layerId } = args as { layerId?: number };
      return bridge.send("layer.get_bounds", { layerId });
    },
  },

  {
    name: "ps_export_png",
    description: "Export the document or selection as PNG to a specified path",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Full file path for the exported PNG",
        },
        quality: {
          type: "string",
          enum: ["maximum", "high", "medium", "low"],
          description: "PNG compression quality (default: maximum)",
        },
      },
      required: ["filePath"],
    },
    handler: async (bridge, args) => {
      const { filePath, quality } = args as { filePath: string; quality?: string };
      return bridge.send("export.png", { filePath, quality: quality || "maximum" });
    },
  },

  {
    name: "ps_export_jpeg",
    description: "Export the document as JPEG to a specified path",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Full file path for the exported JPEG",
        },
        quality: {
          type: "number",
          description: "JPEG quality (0-12, default: 10)",
          minimum: 0,
          maximum: 12,
        },
      },
      required: ["filePath"],
    },
    handler: async (bridge, args) => {
      const { filePath, quality } = args as { filePath: string; quality?: number };
      return bridge.send("export.jpeg", { filePath, quality: quality ?? 10 });
    },
  },

  {
    name: "ps_save_document",
    description: "Save the current document. If it's a new document, requires a file path.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "File path for saving (required for new documents)",
        },
        format: {
          type: "string",
          enum: ["psd", "psb", "tiff", "png", "jpeg"],
          description: "File format (default: psd)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { filePath, format } = args as { filePath?: string; format?: string };
      return bridge.send("doc.save", { filePath, format: format || "psd" });
    },
  },

  {
    name: "ps_new_document",
    description: "Create a new Photoshop document",
    inputSchema: {
      type: "object",
      properties: {
        width: {
          type: "number",
          description: "Document width in pixels",
        },
        height: {
          type: "number",
          description: "Document height in pixels",
        },
        resolution: {
          type: "number",
          description: "Resolution in PPI (default: 72)",
        },
        name: {
          type: "string",
          description: "Document name",
        },
        colorMode: {
          type: "string",
          enum: ["rgb", "cmyk", "grayscale", "lab", "bitmap"],
          description: "Color mode (default: rgb)",
        },
        fillColor: {
          type: "string",
          enum: ["white", "backgroundColor", "transparent"],
          description: "Initial fill color (default: white)",
        },
      },
      required: ["width", "height"],
    },
    handler: async (bridge, args) => {
      const params = args as {
        width: number;
        height: number;
        resolution?: number;
        name?: string;
        colorMode?: string;
        fillColor?: string;
      };
      return bridge.send("doc.new", {
        width: params.width,
        height: params.height,
        resolution: params.resolution ?? 72,
        name: params.name || "Untitled",
        colorMode: params.colorMode || "rgb",
        fillColor: params.fillColor || "white",
      });
    },
  },

  // ============================================================================
  // Fill Operations
  // ============================================================================
  {
    name: "ps_fill_foreground",
    description: "Fill the selection or layer with the foreground color",
    inputSchema: {
      type: "object",
      properties: {
        opacity: {
          type: "number",
          description: "Fill opacity percentage (0-100, default: 100)",
          minimum: 0,
          maximum: 100,
        },
        blendMode: {
          type: "string",
          enum: ["normal", "multiply", "screen", "overlay", "softLight", "hardLight", "colorDodge", "colorBurn", "darken", "lighten", "difference", "exclusion", "hue", "saturation", "color", "luminosity"],
          description: "Blend mode for fill (default: normal)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { opacity, blendMode } = args as { opacity?: number; blendMode?: string };
      return bridge.send("fill.foreground", {
        opacity: opacity ?? 100,
        blendMode: blendMode || "normal",
      });
    },
  },

  {
    name: "ps_fill_background",
    description: "Fill the selection or layer with the background color",
    inputSchema: {
      type: "object",
      properties: {
        opacity: {
          type: "number",
          description: "Fill opacity percentage (0-100, default: 100)",
          minimum: 0,
          maximum: 100,
        },
        blendMode: {
          type: "string",
          enum: ["normal", "multiply", "screen", "overlay", "softLight", "hardLight", "colorDodge", "colorBurn", "darken", "lighten", "difference", "exclusion", "hue", "saturation", "color", "luminosity"],
          description: "Blend mode for fill (default: normal)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { opacity, blendMode } = args as { opacity?: number; blendMode?: string };
      return bridge.send("fill.background", {
        opacity: opacity ?? 100,
        blendMode: blendMode || "normal",
      });
    },
  },

  {
    name: "ps_fill_color",
    description: "Fill the selection or layer with a specific RGB color",
    inputSchema: {
      type: "object",
      properties: {
        red: {
          type: "number",
          description: "Red value (0-255)",
          minimum: 0,
          maximum: 255,
        },
        green: {
          type: "number",
          description: "Green value (0-255)",
          minimum: 0,
          maximum: 255,
        },
        blue: {
          type: "number",
          description: "Blue value (0-255)",
          minimum: 0,
          maximum: 255,
        },
        opacity: {
          type: "number",
          description: "Fill opacity percentage (0-100, default: 100)",
          minimum: 0,
          maximum: 100,
        },
      },
      required: ["red", "green", "blue"],
    },
    handler: async (bridge, args) => {
      const { red, green, blue, opacity } = args as {
        red: number;
        green: number;
        blue: number;
        opacity?: number;
      };
      return bridge.send("fill.color", { red, green, blue, opacity: opacity ?? 100 });
    },
  },

  {
    name: "ps_set_foreground_color",
    description: "Set the foreground color",
    inputSchema: {
      type: "object",
      properties: {
        red: {
          type: "number",
          description: "Red value (0-255)",
          minimum: 0,
          maximum: 255,
        },
        green: {
          type: "number",
          description: "Green value (0-255)",
          minimum: 0,
          maximum: 255,
        },
        blue: {
          type: "number",
          description: "Blue value (0-255)",
          minimum: 0,
          maximum: 255,
        },
      },
      required: ["red", "green", "blue"],
    },
    handler: async (bridge, args) => {
      const { red, green, blue } = args as { red: number; green: number; blue: number };
      return bridge.send("color.set_foreground", { red, green, blue });
    },
  },

  {
    name: "ps_set_background_color",
    description: "Set the background color",
    inputSchema: {
      type: "object",
      properties: {
        red: {
          type: "number",
          description: "Red value (0-255)",
          minimum: 0,
          maximum: 255,
        },
        green: {
          type: "number",
          description: "Green value (0-255)",
          minimum: 0,
          maximum: 255,
        },
        blue: {
          type: "number",
          description: "Blue value (0-255)",
          minimum: 0,
          maximum: 255,
        },
      },
      required: ["red", "green", "blue"],
    },
    handler: async (bridge, args) => {
      const { red, green, blue } = args as { red: number; green: number; blue: number };
      return bridge.send("color.set_background", { red, green, blue });
    },
  },

  // ============================================================================
  // Raw BatchPlay - The "Escape Hatch"
  // ============================================================================
  {
    name: "ps_execute_batchplay",
    description: "Execute a raw Photoshop batchPlay command. Use this for advanced operations not covered by other tools. Requires knowledge of Photoshop Action Descriptors.",
    inputSchema: {
      type: "object",
      properties: {
        descriptor: {
          type: "object",
          description: "The batchPlay JSON descriptor object containing _obj, _target, and other properties",
        },
        historyName: {
          type: "string",
          description: "Name to show in the History panel for this action",
        },
      },
      required: ["descriptor"],
    },
    handler: async (bridge, args) => {
      const { descriptor, historyName } = args as {
        descriptor: Record<string, unknown>;
        historyName?: string;
      };
      return bridge.send("raw.batchplay", {
        descriptor,
        historyName: historyName || "AI Action",
      });
    },
  },

  {
    name: "ps_execute_multiple_batchplay",
    description: "Execute multiple batchPlay commands in sequence as a single history state",
    inputSchema: {
      type: "object",
      properties: {
        descriptors: {
          type: "array",
          description: "Array of batchPlay descriptor objects to execute in sequence",
          items: {
            type: "object",
          },
        },
        historyName: {
          type: "string",
          description: "Name to show in the History panel for this combined action",
        },
      },
      required: ["descriptors"],
    },
    handler: async (bridge, args) => {
      const { descriptors, historyName } = args as {
        descriptors: Record<string, unknown>[];
        historyName?: string;
      };
      return bridge.send("raw.batchplay_multiple", {
        descriptors,
        historyName: historyName || "AI Multi-Action",
      });
    },
  },
];

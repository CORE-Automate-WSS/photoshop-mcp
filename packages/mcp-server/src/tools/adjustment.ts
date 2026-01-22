/**
 * Adjustment Layer Tools
 *
 * Tools for creating and modifying adjustment layers in Photoshop.
 * All use batchPlay for adjustment layer creation.
 */

import type {
  ToolDefinition,
  PhotoshopBridge,
  ToolResponse,
} from "./registry.js";

export const adjustmentTools: ToolDefinition[] = [
  {
    name: "ps_adjust_curves",
    description: "Create a Curves adjustment layer with custom curve points",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        points: {
          type: "array",
          description: "Array of {input, output} points (0-255). E.g., [{input:0,output:0},{input:128,output:140},{input:255,output:255}]",
          items: {
            type: "object",
            properties: {
              input: { type: "number", minimum: 0, maximum: 255 },
              output: { type: "number", minimum: 0, maximum: 255 },
            },
          },
        },
        channel: {
          type: "string",
          enum: ["composite", "red", "green", "blue"],
          description: "Channel to adjust (default: composite/RGB)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.curves", {
        name: args.name,
        points: args.points,
        channel: args.channel ?? "composite",
      });
    },
  },

  {
    name: "ps_adjust_levels",
    description: "Create a Levels adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        inputBlack: {
          type: "number",
          minimum: 0,
          maximum: 255,
          description: "Input black point (0-255, default: 0)",
        },
        inputWhite: {
          type: "number",
          minimum: 0,
          maximum: 255,
          description: "Input white point (0-255, default: 255)",
        },
        gamma: {
          type: "number",
          minimum: 0.1,
          maximum: 10,
          description: "Gamma/midtones (0.1-10, default: 1.0)",
        },
        outputBlack: {
          type: "number",
          minimum: 0,
          maximum: 255,
          description: "Output black point (0-255, default: 0)",
        },
        outputWhite: {
          type: "number",
          minimum: 0,
          maximum: 255,
          description: "Output white point (0-255, default: 255)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.levels", {
        name: args.name,
        inputBlack: args.inputBlack ?? 0,
        inputWhite: args.inputWhite ?? 255,
        gamma: args.gamma ?? 1.0,
        outputBlack: args.outputBlack ?? 0,
        outputWhite: args.outputWhite ?? 255,
      });
    },
  },

  {
    name: "ps_adjust_hue_saturation",
    description: "Create a Hue/Saturation adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        hue: {
          type: "number",
          minimum: -180,
          maximum: 180,
          description: "Hue shift (-180 to 180, default: 0)",
        },
        saturation: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Saturation (-100 to 100, default: 0)",
        },
        lightness: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Lightness (-100 to 100, default: 0)",
        },
        colorize: {
          type: "boolean",
          description: "Enable colorize mode (default: false)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.hue_saturation", {
        name: args.name,
        hue: args.hue ?? 0,
        saturation: args.saturation ?? 0,
        lightness: args.lightness ?? 0,
        colorize: args.colorize ?? false,
      });
    },
  },

  {
    name: "ps_adjust_brightness_contrast",
    description: "Create a Brightness/Contrast adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        brightness: {
          type: "number",
          minimum: -150,
          maximum: 150,
          description: "Brightness (-150 to 150, default: 0)",
        },
        contrast: {
          type: "number",
          minimum: -50,
          maximum: 100,
          description: "Contrast (-50 to 100, default: 0)",
        },
        useLegacy: {
          type: "boolean",
          description: "Use legacy mode (default: false)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.brightness_contrast", {
        name: args.name,
        brightness: args.brightness ?? 0,
        contrast: args.contrast ?? 0,
        useLegacy: args.useLegacy ?? false,
      });
    },
  },

  {
    name: "ps_adjust_vibrance",
    description: "Create a Vibrance adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        vibrance: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Vibrance (-100 to 100, default: 0)",
        },
        saturation: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Saturation (-100 to 100, default: 0)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.vibrance", {
        name: args.name,
        vibrance: args.vibrance ?? 0,
        saturation: args.saturation ?? 0,
      });
    },
  },

  {
    name: "ps_adjust_color_balance",
    description: "Create a Color Balance adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        shadowsCyanRed: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Shadows cyan-red (-100 to 100)",
        },
        shadowsMagentaGreen: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Shadows magenta-green (-100 to 100)",
        },
        shadowsYellowBlue: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Shadows yellow-blue (-100 to 100)",
        },
        midtonesCyanRed: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Midtones cyan-red (-100 to 100)",
        },
        midtonesMagentaGreen: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Midtones magenta-green (-100 to 100)",
        },
        midtonesYellowBlue: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Midtones yellow-blue (-100 to 100)",
        },
        highlightsCyanRed: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Highlights cyan-red (-100 to 100)",
        },
        highlightsMagentaGreen: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Highlights magenta-green (-100 to 100)",
        },
        highlightsYellowBlue: {
          type: "number",
          minimum: -100,
          maximum: 100,
          description: "Highlights yellow-blue (-100 to 100)",
        },
        preserveLuminosity: {
          type: "boolean",
          description: "Preserve luminosity (default: true)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.color_balance", {
        name: args.name,
        shadows: [
          args.shadowsCyanRed ?? 0,
          args.shadowsMagentaGreen ?? 0,
          args.shadowsYellowBlue ?? 0,
        ],
        midtones: [
          args.midtonesCyanRed ?? 0,
          args.midtonesMagentaGreen ?? 0,
          args.midtonesYellowBlue ?? 0,
        ],
        highlights: [
          args.highlightsCyanRed ?? 0,
          args.highlightsMagentaGreen ?? 0,
          args.highlightsYellowBlue ?? 0,
        ],
        preserveLuminosity: args.preserveLuminosity ?? true,
      });
    },
  },

  {
    name: "ps_adjust_black_white",
    description: "Create a Black & White adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        red: {
          type: "number",
          minimum: -200,
          maximum: 300,
          description: "Red contribution (default: 40)",
        },
        yellow: {
          type: "number",
          minimum: -200,
          maximum: 300,
          description: "Yellow contribution (default: 60)",
        },
        green: {
          type: "number",
          minimum: -200,
          maximum: 300,
          description: "Green contribution (default: 40)",
        },
        cyan: {
          type: "number",
          minimum: -200,
          maximum: 300,
          description: "Cyan contribution (default: 60)",
        },
        blue: {
          type: "number",
          minimum: -200,
          maximum: 300,
          description: "Blue contribution (default: 20)",
        },
        magenta: {
          type: "number",
          minimum: -200,
          maximum: 300,
          description: "Magenta contribution (default: 80)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.black_white", {
        name: args.name,
        red: args.red ?? 40,
        yellow: args.yellow ?? 60,
        green: args.green ?? 40,
        cyan: args.cyan ?? 60,
        blue: args.blue ?? 20,
        magenta: args.magenta ?? 80,
      });
    },
  },

  {
    name: "ps_adjust_exposure",
    description: "Create an Exposure adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        exposure: {
          type: "number",
          minimum: -20,
          maximum: 20,
          description: "Exposure (-20 to 20, default: 0)",
        },
        offset: {
          type: "number",
          minimum: -0.5,
          maximum: 0.5,
          description: "Offset (-0.5 to 0.5, default: 0)",
        },
        gamma: {
          type: "number",
          minimum: 0.01,
          maximum: 9.99,
          description: "Gamma correction (0.01-9.99, default: 1.0)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.exposure", {
        name: args.name,
        exposure: args.exposure ?? 0,
        offset: args.offset ?? 0,
        gamma: args.gamma ?? 1.0,
      });
    },
  },

  {
    name: "ps_adjust_invert",
    description: "Create an Invert adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.invert", { name: args.name });
    },
  },

  {
    name: "ps_adjust_posterize",
    description: "Create a Posterize adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        levels: {
          type: "number",
          minimum: 2,
          maximum: 255,
          description: "Number of tonal levels (2-255, default: 4)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.posterize", {
        name: args.name,
        levels: args.levels ?? 4,
      });
    },
  },

  {
    name: "ps_adjust_threshold",
    description: "Create a Threshold adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        level: {
          type: "number",
          minimum: 1,
          maximum: 255,
          description: "Threshold level (1-255, default: 128)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.threshold", {
        name: args.name,
        level: args.level ?? 128,
      });
    },
  },

  {
    name: "ps_adjust_photo_filter",
    description: "Create a Photo Filter adjustment layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the adjustment layer",
        },
        color: {
          type: "object",
          description: "Filter color as RGB {red, green, blue} (0-255)",
          properties: {
            red: { type: "number", minimum: 0, maximum: 255 },
            green: { type: "number", minimum: 0, maximum: 255 },
            blue: { type: "number", minimum: 0, maximum: 255 },
          },
        },
        density: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description: "Filter density (1-100, default: 25)",
        },
        preserveLuminosity: {
          type: "boolean",
          description: "Preserve luminosity (default: true)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("adjust.photo_filter", {
        name: args.name,
        color: args.color ?? { red: 236, green: 138, blue: 0 }, // Warming filter default
        density: args.density ?? 25,
        preserveLuminosity: args.preserveLuminosity ?? true,
      });
    },
  },

  {
    name: "ps_fill_solid_color",
    description: "Create a Solid Color fill layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the fill layer",
        },
        color: {
          type: "object",
          description: "Fill color as RGB {red, green, blue} (0-255)",
          properties: {
            red: { type: "number", minimum: 0, maximum: 255 },
            green: { type: "number", minimum: 0, maximum: 255 },
            blue: { type: "number", minimum: 0, maximum: 255 },
          },
          required: ["red", "green", "blue"],
        },
      },
      required: ["color"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("fill.solid_color", {
        name: args.name,
        color: args.color,
      });
    },
  },
];

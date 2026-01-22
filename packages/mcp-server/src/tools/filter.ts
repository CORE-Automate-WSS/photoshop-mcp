import { ToolDefinition } from "./registry.js";

/**
 * Filter tools - These all require batchPlay as DOM doesn't support filters
 * Based on Adobe UXP documentation and Alchemist recordings
 */
export const filterTools: ToolDefinition[] = [
  // ============================================================================
  // Blur Filters
  // ============================================================================
  {
    name: "ps_filter_gaussian_blur",
    description: "Apply Gaussian Blur filter to the active layer. Creates a soft, smooth blur effect.",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Blur radius in pixels (0.1 to 250)",
          minimum: 0.1,
          maximum: 250,
        },
      },
      required: ["radius"],
    },
    handler: async (bridge, args) => {
      const { radius } = args as { radius: number };
      return bridge.send("filter.gaussian_blur", { radius });
    },
  },

  {
    name: "ps_filter_motion_blur",
    description: "Apply Motion Blur filter to simulate camera or object movement",
    inputSchema: {
      type: "object",
      properties: {
        angle: {
          type: "number",
          description: "Angle of blur in degrees (-360 to 360)",
          minimum: -360,
          maximum: 360,
        },
        distance: {
          type: "number",
          description: "Distance/length of blur in pixels (1 to 2000)",
          minimum: 1,
          maximum: 2000,
        },
      },
      required: ["angle", "distance"],
    },
    handler: async (bridge, args) => {
      const { angle, distance } = args as { angle: number; distance: number };
      return bridge.send("filter.motion_blur", { angle, distance });
    },
  },

  {
    name: "ps_filter_radial_blur",
    description: "Apply Radial Blur filter for spin or zoom effects",
    inputSchema: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Blur amount (1 to 100)",
          minimum: 1,
          maximum: 100,
        },
        blurMethod: {
          type: "string",
          enum: ["spin", "zoom"],
          description: "Type of radial blur: spin (rotational) or zoom (outward)",
        },
        blurQuality: {
          type: "string",
          enum: ["draft", "good", "best"],
          description: "Quality level - higher is slower but smoother",
        },
      },
      required: ["amount", "blurMethod"],
    },
    handler: async (bridge, args) => {
      const { amount, blurMethod, blurQuality } = args as {
        amount: number;
        blurMethod: string;
        blurQuality?: string;
      };
      return bridge.send("filter.radial_blur", {
        amount,
        blurMethod,
        blurQuality: blurQuality || "good",
      });
    },
  },

  {
    name: "ps_filter_surface_blur",
    description: "Apply Surface Blur to smooth surfaces while preserving edges",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Blur radius in pixels (1 to 100)",
          minimum: 1,
          maximum: 100,
        },
        threshold: {
          type: "number",
          description: "Edge preservation threshold (2 to 255) - higher preserves more edges",
          minimum: 2,
          maximum: 255,
        },
      },
      required: ["radius", "threshold"],
    },
    handler: async (bridge, args) => {
      const { radius, threshold } = args as { radius: number; threshold: number };
      return bridge.send("filter.surface_blur", { radius, threshold });
    },
  },

  {
    name: "ps_filter_lens_blur",
    description: "Apply Lens Blur for realistic depth-of-field bokeh effects",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Blur radius (0 to 100)",
          minimum: 0,
          maximum: 100,
        },
        bladeCurvature: {
          type: "number",
          description: "Blade curvature for bokeh shape (0 to 100)",
          minimum: 0,
          maximum: 100,
        },
        rotation: {
          type: "number",
          description: "Rotation of bokeh shape in degrees (0 to 360)",
          minimum: 0,
          maximum: 360,
        },
        brightness: {
          type: "number",
          description: "Specular highlight brightness (0 to 100)",
          minimum: 0,
          maximum: 100,
        },
        threshold: {
          type: "number",
          description: "Specular highlight threshold (0 to 255)",
          minimum: 0,
          maximum: 255,
        },
      },
      required: ["radius"],
    },
    handler: async (bridge, args) => {
      const { radius, bladeCurvature, rotation, brightness, threshold } = args as {
        radius: number;
        bladeCurvature?: number;
        rotation?: number;
        brightness?: number;
        threshold?: number;
      };
      return bridge.send("filter.lens_blur", {
        radius,
        bladeCurvature: bladeCurvature ?? 0,
        rotation: rotation ?? 0,
        brightness: brightness ?? 0,
        threshold: threshold ?? 255,
      });
    },
  },

  // ============================================================================
  // Sharpen Filters
  // ============================================================================
  {
    name: "ps_filter_unsharp_mask",
    description: "Apply Unsharp Mask for precise sharpening control",
    inputSchema: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Sharpening strength as percentage (1 to 500)",
          minimum: 1,
          maximum: 500,
        },
        radius: {
          type: "number",
          description: "Radius of sharpening in pixels (0.1 to 250)",
          minimum: 0.1,
          maximum: 250,
        },
        threshold: {
          type: "number",
          description: "Threshold for edge detection (0 to 255) - higher ignores subtle edges",
          minimum: 0,
          maximum: 255,
        },
      },
      required: ["amount", "radius"],
    },
    handler: async (bridge, args) => {
      const { amount, radius, threshold } = args as {
        amount: number;
        radius: number;
        threshold?: number;
      };
      return bridge.send("filter.unsharp_mask", {
        amount,
        radius,
        threshold: threshold ?? 0,
      });
    },
  },

  {
    name: "ps_filter_smart_sharpen",
    description: "Apply Smart Sharpen with advanced edge detection and shadow/highlight control",
    inputSchema: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Sharpening strength as percentage (1 to 500)",
          minimum: 1,
          maximum: 500,
        },
        radius: {
          type: "number",
          description: "Radius of sharpening in pixels (0.1 to 64)",
          minimum: 0.1,
          maximum: 64,
        },
        noiseReduction: {
          type: "number",
          description: "Noise reduction percentage (0 to 100)",
          minimum: 0,
          maximum: 100,
        },
        removeBlur: {
          type: "string",
          enum: ["gaussianBlur", "lensBlur", "motionBlur"],
          description: "Type of blur to counteract",
        },
      },
      required: ["amount", "radius"],
    },
    handler: async (bridge, args) => {
      const { amount, radius, noiseReduction, removeBlur } = args as {
        amount: number;
        radius: number;
        noiseReduction?: number;
        removeBlur?: string;
      };
      return bridge.send("filter.smart_sharpen", {
        amount,
        radius,
        noiseReduction: noiseReduction ?? 0,
        removeBlur: removeBlur || "gaussianBlur",
      });
    },
  },

  // ============================================================================
  // Noise Filters
  // ============================================================================
  {
    name: "ps_filter_add_noise",
    description: "Add random noise/grain to an image",
    inputSchema: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Noise amount as percentage (0.1 to 400)",
          minimum: 0.1,
          maximum: 400,
        },
        distribution: {
          type: "string",
          enum: ["uniform", "gaussian"],
          description: "Noise distribution pattern",
        },
        monochromatic: {
          type: "boolean",
          description: "Use grayscale noise only (no color noise)",
        },
      },
      required: ["amount"],
    },
    handler: async (bridge, args) => {
      const { amount, distribution, monochromatic } = args as {
        amount: number;
        distribution?: string;
        monochromatic?: boolean;
      };
      return bridge.send("filter.add_noise", {
        amount,
        distribution: distribution || "uniform",
        monochromatic: monochromatic ?? false,
      });
    },
  },

  {
    name: "ps_filter_reduce_noise",
    description: "Reduce noise/grain while preserving detail",
    inputSchema: {
      type: "object",
      properties: {
        strength: {
          type: "number",
          description: "Overall noise reduction strength (0 to 10)",
          minimum: 0,
          maximum: 10,
        },
        preserveDetails: {
          type: "number",
          description: "Detail preservation percentage (0 to 100)",
          minimum: 0,
          maximum: 100,
        },
        reduceColorNoise: {
          type: "number",
          description: "Color noise reduction percentage (0 to 100)",
          minimum: 0,
          maximum: 100,
        },
        sharpenDetails: {
          type: "number",
          description: "Detail sharpening percentage (0 to 100)",
          minimum: 0,
          maximum: 100,
        },
      },
      required: ["strength"],
    },
    handler: async (bridge, args) => {
      const { strength, preserveDetails, reduceColorNoise, sharpenDetails } = args as {
        strength: number;
        preserveDetails?: number;
        reduceColorNoise?: number;
        sharpenDetails?: number;
      };
      return bridge.send("filter.reduce_noise", {
        strength,
        preserveDetails: preserveDetails ?? 50,
        reduceColorNoise: reduceColorNoise ?? 50,
        sharpenDetails: sharpenDetails ?? 25,
      });
    },
  },

  // ============================================================================
  // Distort Filters
  // ============================================================================
  {
    name: "ps_filter_liquify_push",
    description: "Apply a simple liquify push/warp effect at a specific point",
    inputSchema: {
      type: "object",
      properties: {
        startX: {
          type: "number",
          description: "Starting X coordinate (in pixels)",
        },
        startY: {
          type: "number",
          description: "Starting Y coordinate (in pixels)",
        },
        endX: {
          type: "number",
          description: "Ending X coordinate (direction of push)",
        },
        endY: {
          type: "number",
          description: "Ending Y coordinate (direction of push)",
        },
        brushSize: {
          type: "number",
          description: "Brush size in pixels (1 to 15000)",
          minimum: 1,
          maximum: 15000,
        },
        brushPressure: {
          type: "number",
          description: "Brush pressure (1 to 100)",
          minimum: 1,
          maximum: 100,
        },
      },
      required: ["startX", "startY", "endX", "endY", "brushSize"],
    },
    handler: async (bridge, args) => {
      const { startX, startY, endX, endY, brushSize, brushPressure } = args as {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        brushSize: number;
        brushPressure?: number;
      };
      return bridge.send("filter.liquify_push", {
        startX,
        startY,
        endX,
        endY,
        brushSize,
        brushPressure: brushPressure ?? 50,
      });
    },
  },

  // ============================================================================
  // Stylize Filters
  // ============================================================================
  {
    name: "ps_filter_emboss",
    description: "Apply emboss effect to create a raised or stamped appearance",
    inputSchema: {
      type: "object",
      properties: {
        angle: {
          type: "number",
          description: "Light angle in degrees (-360 to 360)",
          minimum: -360,
          maximum: 360,
        },
        height: {
          type: "number",
          description: "Emboss height in pixels (1 to 10)",
          minimum: 1,
          maximum: 10,
        },
        amount: {
          type: "number",
          description: "Effect strength as percentage (1 to 500)",
          minimum: 1,
          maximum: 500,
        },
      },
      required: ["angle", "height", "amount"],
    },
    handler: async (bridge, args) => {
      const { angle, height, amount } = args as {
        angle: number;
        height: number;
        amount: number;
      };
      return bridge.send("filter.emboss", { angle, height, amount });
    },
  },

  {
    name: "ps_filter_find_edges",
    description: "Detect and highlight edges in the image",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("filter.find_edges", {});
    },
  },

  // ============================================================================
  // Other Useful Filters
  // ============================================================================
  {
    name: "ps_filter_high_pass",
    description: "Apply High Pass filter - useful for sharpening workflows when combined with Overlay blend mode",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Radius in pixels (0.1 to 250)",
          minimum: 0.1,
          maximum: 250,
        },
      },
      required: ["radius"],
    },
    handler: async (bridge, args) => {
      const { radius } = args as { radius: number };
      return bridge.send("filter.high_pass", { radius });
    },
  },

  {
    name: "ps_filter_dust_and_scratches",
    description: "Remove dust and scratches from scanned images",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Search radius in pixels (1 to 100)",
          minimum: 1,
          maximum: 100,
        },
        threshold: {
          type: "number",
          description: "Threshold for detail preservation (0 to 255)",
          minimum: 0,
          maximum: 255,
        },
      },
      required: ["radius"],
    },
    handler: async (bridge, args) => {
      const { radius, threshold } = args as { radius: number; threshold?: number };
      return bridge.send("filter.dust_and_scratches", {
        radius,
        threshold: threshold ?? 0,
      });
    },
  },

  {
    name: "ps_filter_median",
    description: "Apply Median filter to reduce noise while preserving edges",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Radius in pixels (1 to 500)",
          minimum: 1,
          maximum: 500,
        },
      },
      required: ["radius"],
    },
    handler: async (bridge, args) => {
      const { radius } = args as { radius: number };
      return bridge.send("filter.median", { radius });
    },
  },

  {
    name: "ps_filter_maximum",
    description: "Apply Maximum filter - spreads white areas, useful for expanding masks",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Radius in pixels (1 to 500)",
          minimum: 1,
          maximum: 500,
        },
      },
      required: ["radius"],
    },
    handler: async (bridge, args) => {
      const { radius } = args as { radius: number };
      return bridge.send("filter.maximum", { radius });
    },
  },

  {
    name: "ps_filter_minimum",
    description: "Apply Minimum filter - spreads dark areas, useful for contracting masks",
    inputSchema: {
      type: "object",
      properties: {
        radius: {
          type: "number",
          description: "Radius in pixels (1 to 500)",
          minimum: 1,
          maximum: 500,
        },
      },
      required: ["radius"],
    },
    handler: async (bridge, args) => {
      const { radius } = args as { radius: number };
      return bridge.send("filter.minimum", { radius });
    },
  },
];

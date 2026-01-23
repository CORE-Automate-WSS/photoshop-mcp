/**
 * Generative & Content-Aware Tools
 *
 * Tools for AI-powered image generation and content-aware operations.
 *
 * Note: Generative Fill requires Adobe Creative Cloud subscription with
 * Firefly credits and internet connection. Content-Aware Fill works locally.
 */

import { createTool, z } from "./factory.js";
import type { ToolDefinition, ToolResponse, PhotoshopBridge } from "./registry.js";

// Schemas
const contentAwareFillSchema = z.object({
  sampleAllLayers: z
    .boolean()
    .default(false)
    .describe("Sample from all visible layers instead of just active layer"),
  colorAdaptation: z
    .enum(["none", "default", "high"])
    .default("default")
    .describe("How much color adaptation to apply"),
  rotation: z
    .enum(["none", "low", "medium", "high", "full"])
    .default("none")
    .describe("Allow rotation of sampled content"),
  scale: z
    .boolean()
    .default(false)
    .describe("Allow scaling of sampled content"),
  mirror: z
    .boolean()
    .default(false)
    .describe("Allow mirroring of sampled content"),
});

const generativeFillSchema = z.object({
  prompt: z
    .string()
    .default("")
    .describe("Text prompt describing what to generate. Empty string removes content."),
  sampleAllLayers: z
    .boolean()
    .default(true)
    .describe("Sample context from all visible layers"),
});

const generativeExpandSchema = z.object({
  prompt: z
    .string()
    .default("")
    .describe("Text prompt describing what to generate in expanded area"),
  top: z
    .number()
    .default(0)
    .describe("Pixels to expand at top"),
  bottom: z
    .number()
    .default(0)
    .describe("Pixels to expand at bottom"),
  left: z
    .number()
    .default(0)
    .describe("Pixels to expand at left"),
  right: z
    .number()
    .default(0)
    .describe("Pixels to expand at right"),
});

const removeBackgroundSchema = z.object({
  outputToNewLayer: z
    .boolean()
    .default(true)
    .describe("Output result to new layer (preserves original)"),
});

// Tools
export const generativeTools: ToolDefinition[] = [
  // Content-Aware Fill - works locally, reliable
  createTool(
    "ps_content_aware_fill",
    "Fill the current selection using Content-Aware Fill. Analyzes surrounding content to seamlessly fill the selected area. Works locally without cloud services.",
    contentAwareFillSchema,
    "generate.content_aware_fill"
  ),

  // Generative Fill - requires cloud, experimental
  {
    name: "ps_generative_fill",
    description:
      "Fill the current selection using AI-powered Generative Fill (Adobe Firefly). " +
      "Requires active selection, internet connection, and Adobe Creative Cloud subscription. " +
      "Use empty prompt to remove objects, or describe what to generate. " +
      "Note: This is cloud-based and may take 10-30 seconds.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Text prompt describing what to generate. Empty string removes content.",
        },
        sampleAllLayers: {
          type: "boolean",
          description: "Sample context from all visible layers (default: true)",
        },
      },
    },
    handler: async (bridge: PhotoshopBridge, args): Promise<ToolResponse> => {
      const result = generativeFillSchema.safeParse(args);
      if (!result.success) {
        return {
          ok: false,
          changed: false,
          error: `Validation failed: ${result.error.message}`,
        };
      }
      return bridge.send("generate.generative_fill", result.data);
    },
  },

  // Generative Expand - requires cloud, experimental
  {
    name: "ps_generative_expand",
    description:
      "Expand the canvas and fill new areas using AI-powered generation (Adobe Firefly). " +
      "Specify how many pixels to expand in each direction. " +
      "Requires internet connection and Adobe Creative Cloud subscription. " +
      "Note: This is cloud-based and may take 10-30 seconds.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Text prompt describing what to generate in expanded area",
        },
        top: { type: "number", description: "Pixels to expand at top" },
        bottom: { type: "number", description: "Pixels to expand at bottom" },
        left: { type: "number", description: "Pixels to expand at left" },
        right: { type: "number", description: "Pixels to expand at right" },
      },
    },
    handler: async (bridge: PhotoshopBridge, args): Promise<ToolResponse> => {
      const result = generativeExpandSchema.safeParse(args);
      if (!result.success) {
        return {
          ok: false,
          changed: false,
          error: `Validation failed: ${result.error.message}`,
        };
      }
      return bridge.send("generate.generative_expand", result.data);
    },
  },

  // Remove Background - uses Select Subject + delete
  createTool(
    "ps_remove_background",
    "Remove the background from the image using AI-powered subject selection. Selects the main subject and removes everything else.",
    removeBackgroundSchema,
    "generate.remove_background"
  ),
];

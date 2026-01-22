/**
 * Layer Tools
 *
 * Tools for working with Photoshop layers.
 * Uses Zod validation for type-safe parameter handling.
 */

import { createTool, createSimpleTool, z } from "./factory.js";
import type { ToolDefinition } from "./registry.js";

// Schemas
const layerIdSchema = z.object({
  layerId: z.number().describe("The layer ID"),
});

const createLayerSchema = z.object({
  name: z.string().optional().describe("Name for the new layer"),
  opacity: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Layer opacity (0-100, default: 100)"),
  blendMode: z
    .string()
    .optional()
    .describe("Blend mode (e.g., 'normal', 'multiply', 'screen')"),
});

const duplicateLayerSchema = z.object({
  layerId: z.number().describe("The layer ID to duplicate"),
  name: z.string().optional().describe("Name for the duplicated layer"),
});

const renameLayerSchema = z.object({
  layerId: z.number().describe("The layer ID to rename"),
  name: z.string().describe("New name for the layer"),
});

const visibilitySchema = z.object({
  layerId: z.number().describe("The layer ID"),
  visible: z.boolean().describe("Whether the layer should be visible"),
});

const opacitySchema = z.object({
  layerId: z.number().describe("The layer ID"),
  opacity: z.number().min(0).max(100).describe("Opacity percentage (0-100)"),
});

const listLayersSchema = z.object({
  includeHidden: z
    .boolean()
    .default(true)
    .describe("Include hidden layers (default: true)"),
});

const groupCreateSchema = z.object({
  name: z.string().optional().describe("Name for the group"),
});

// Tools
export const layerTools: ToolDefinition[] = [
  createTool(
    "ps_layer_create",
    "Create a new empty layer",
    createLayerSchema,
    "layer.create"
  ),

  createTool(
    "ps_layer_duplicate",
    "Duplicate an existing layer",
    duplicateLayerSchema,
    "layer.duplicate"
  ),

  createTool(
    "ps_layer_delete",
    "Delete a layer",
    layerIdSchema,
    "layer.delete"
  ),

  createTool(
    "ps_layer_group_create",
    "Create a new layer group (folder)",
    groupCreateSchema,
    "layer.group_create"
  ),

  createTool(
    "ps_layer_list",
    "List all layers in the current document with their IDs, names, and types",
    listLayersSchema,
    "layer.list"
  ),

  createTool(
    "ps_layer_select",
    "Select a layer by its ID",
    layerIdSchema,
    "layer.select"
  ),

  createTool(
    "ps_layer_rename",
    "Rename a layer",
    renameLayerSchema,
    "layer.rename"
  ),

  createTool(
    "ps_layer_set_visibility",
    "Show or hide a layer",
    visibilitySchema,
    "layer.set_visibility"
  ),

  createTool(
    "ps_layer_set_opacity",
    "Set layer opacity",
    opacitySchema,
    "layer.set_opacity"
  ),
];

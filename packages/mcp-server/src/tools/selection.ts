/**
 * Selection Tools
 *
 * Tools for working with Photoshop selections.
 * Uses Zod validation for type-safe parameter handling.
 */

import { createTool, createSimpleTool, z } from "./factory.js";
import type { ToolDefinition } from "./registry.js";

// Schemas
const selectSubjectSchema = z.object({
  sampleAllLayers: z
    .boolean()
    .default(false)
    .describe("Sample all layers instead of just the active layer"),
});

const rectangleSchema = z.object({
  top: z.number().describe("Top edge in pixels"),
  left: z.number().describe("Left edge in pixels"),
  bottom: z.number().describe("Bottom edge in pixels"),
  right: z.number().describe("Right edge in pixels"),
  feather: z.number().default(0).describe("Feather radius in pixels"),
});

const pixelsSchema = z.object({
  pixels: z.number().describe("Number of pixels"),
});

const radiusSchema = z.object({
  radius: z.number().describe("Radius in pixels"),
});

const toleranceSchema = z.object({
  tolerance: z.number().min(0).max(255).describe("Color tolerance (0-255)"),
});

// Tools
export const selectionTools: ToolDefinition[] = [
  createTool(
    "ps_select_subject",
    "Automatically select the main subject in the image using AI (Select Subject)",
    selectSubjectSchema,
    "selection.select_subject"
  ),

  createSimpleTool(
    "ps_select_all",
    "Select the entire canvas",
    "selection.select_all"
  ),

  createSimpleTool(
    "ps_select_none",
    "Deselect all (clear selection)",
    "selection.deselect"
  ),

  createSimpleTool(
    "ps_select_inverse",
    "Invert the current selection",
    "selection.inverse"
  ),

  createTool(
    "ps_select_rectangle",
    "Create a rectangular selection",
    rectangleSchema,
    "selection.select_rectangle"
  ),

  createTool(
    "ps_select_ellipse",
    "Create an elliptical selection",
    rectangleSchema,
    "selection.select_ellipse"
  ),

  createTool(
    "ps_selection_expand",
    "Expand the current selection by a specified number of pixels",
    pixelsSchema,
    "selection.expand"
  ),

  createTool(
    "ps_selection_contract",
    "Contract the current selection by a specified number of pixels",
    pixelsSchema,
    "selection.contract"
  ),

  createTool(
    "ps_selection_feather",
    "Feather the current selection edges",
    radiusSchema,
    "selection.feather"
  ),

  createTool(
    "ps_selection_grow",
    "Grow selection to include adjacent pixels with similar colors",
    toleranceSchema,
    "selection.grow"
  ),

  createSimpleTool(
    "ps_selection_get_bounds",
    "Get the bounding box of the current selection",
    "selection.get_bounds"
  ),
];

/**
 * Document Tools
 *
 * Tools for working with Photoshop documents.
 * Uses Zod validation for type-safe parameter handling.
 */

import { createTool, createSimpleTool, z } from "./factory.js";
import type { ToolDefinition } from "./registry.js";

// Schemas
const openDocSchema = z.object({
  path: z.string().describe("Absolute file path to the document"),
});

const saveAsSchema = z.object({
  path: z.string().describe("Absolute file path to save to"),
  format: z
    .enum(["psd", "png", "jpg", "tiff"])
    .optional()
    .describe("File format (default: inferred from extension)"),
});

// Tools
export const documentTools: ToolDefinition[] = [
  createSimpleTool(
    "ps_doc_get_active",
    "Get information about the currently active Photoshop document",
    "doc.get_active"
  ),

  createTool(
    "ps_doc_open",
    "Open a document from a file path",
    openDocSchema,
    "doc.open"
  ),

  createSimpleTool(
    "ps_doc_save",
    "Save the current document",
    "doc.save"
  ),

  createTool(
    "ps_doc_save_as",
    "Save the current document to a new path",
    saveAsSchema,
    "doc.save_as"
  ),
];

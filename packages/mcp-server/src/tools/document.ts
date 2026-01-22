/**
 * Document Tools
 *
 * Tools for working with Photoshop documents.
 */

import type {
  ToolDefinition,
  PhotoshopBridge,
  ToolResponse,
} from "./registry.js";

export const documentTools: ToolDefinition[] = [
  {
    name: "ps_doc_get_active",
    description:
      "Get information about the currently active Photoshop document",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge: PhotoshopBridge): Promise<ToolResponse> => {
      return bridge.send("doc.get_active", {});
    },
  },

  {
    name: "ps_doc_open",
    description: "Open a document from a file path",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute file path to the document",
        },
      },
      required: ["path"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> => {
      return bridge.send("doc.open", { path: args.path });
    },
  },

  {
    name: "ps_doc_save",
    description: "Save the current document",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge: PhotoshopBridge): Promise<ToolResponse> => {
      return bridge.send("doc.save", {});
    },
  },

  {
    name: "ps_doc_save_as",
    description: "Save the current document to a new path",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Absolute file path to save to",
        },
        format: {
          type: "string",
          enum: ["psd", "png", "jpg", "tiff"],
          description: "File format (default: inferred from extension)",
        },
      },
      required: ["path"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> => {
      return bridge.send("doc.save_as", {
        path: args.path,
        format: args.format,
      });
    },
  },
];

/**
 * Layer Tools
 *
 * Tools for working with Photoshop layers.
 */

import type {
  ToolDefinition,
  PhotoshopBridge,
  ToolResponse,
} from "./registry.js";

export const layerTools: ToolDefinition[] = [
  {
    name: "ps_layer_create",
    description: "Create a new empty layer",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the new layer",
        },
        opacity: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Layer opacity (0-100, default: 100)",
        },
        blendMode: {
          type: "string",
          description: "Blend mode (e.g., 'normal', 'multiply', 'screen')",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("layer.create", {
        name: args.name,
        opacity: args.opacity,
        blendMode: args.blendMode,
      });
    },
  },

  {
    name: "ps_layer_duplicate",
    description: "Duplicate an existing layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "The layer ID to duplicate",
        },
        name: {
          type: "string",
          description: "Name for the duplicated layer (optional)",
        },
      },
      required: ["layerId"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("layer.duplicate", {
        layerId: args.layerId,
        name: args.name,
      });
    },
  },

  {
    name: "ps_layer_delete",
    description: "Delete a layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "The layer ID to delete",
        },
      },
      required: ["layerId"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("layer.delete", { layerId: args.layerId });
    },
  },

  {
    name: "ps_layer_group_create",
    description: "Create a new layer group (folder)",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the group",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      return bridge.send("layer.group_create", { name: args.name });
    },
  },


  {
    name: "ps_layer_list",
    description:
      "List all layers in the current document with their IDs, names, and types",
    inputSchema: {
      type: "object",
      properties: {
        includeHidden: {
          type: "boolean",
          description: "Include hidden layers (default: true)",
        },
      },
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> => {
      return bridge.send("layer.list", {
        includeHidden: args.includeHidden ?? true,
      });
    },
  },

  {
    name: "ps_layer_select",
    description: "Select a layer by its ID",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "The layer ID to select",
        },
      },
      required: ["layerId"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> => {
      return bridge.send("layer.select", { layerId: args.layerId });
    },
  },

  {
    name: "ps_layer_rename",
    description: "Rename a layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "The layer ID to rename",
        },
        name: {
          type: "string",
          description: "New name for the layer",
        },
      },
      required: ["layerId", "name"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> => {
      return bridge.send("layer.rename", {
        layerId: args.layerId,
        name: args.name,
      });
    },
  },

  {
    name: "ps_layer_set_visibility",
    description: "Show or hide a layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "The layer ID",
        },
        visible: {
          type: "boolean",
          description: "Whether the layer should be visible",
        },
      },
      required: ["layerId", "visible"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> => {
      return bridge.send("layer.set_visibility", {
        layerId: args.layerId,
        visible: args.visible,
      });
    },
  },

  {
    name: "ps_layer_set_opacity",
    description: "Set layer opacity",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "The layer ID",
        },
        opacity: {
          type: "number",
          minimum: 0,
          maximum: 100,
          description: "Opacity percentage (0-100)",
        },
      },
      required: ["layerId", "opacity"],
    },
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>,
    ): Promise<ToolResponse> => {
      return bridge.send("layer.set_opacity", {
        layerId: args.layerId,
        opacity: args.opacity,
      });
    },
  },
];

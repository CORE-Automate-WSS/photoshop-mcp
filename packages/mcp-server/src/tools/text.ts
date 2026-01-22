import { ToolDefinition } from "./registry.js";

/**
 * Text layer tools - Create and modify text/type layers
 * Based on Adobe UXP documentation
 */
export const textTools: ToolDefinition[] = [
  {
    name: "ps_text_create",
    description: "Create a new text layer with specified content, font, size, and color",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text content to display",
        },
        fontName: {
          type: "string",
          description: "Font PostScript name (e.g., 'ArialMT', 'Helvetica-Bold'). Use ps_text_get_fonts to find available fonts.",
        },
        fontSize: {
          type: "number",
          description: "Font size in points (default: 24)",
        },
        color: {
          type: "object",
          description: "Text color as RGB object {red: 0-255, green: 0-255, blue: 0-255}",
          properties: {
            red: { type: "number", minimum: 0, maximum: 255 },
            green: { type: "number", minimum: 0, maximum: 255 },
            blue: { type: "number", minimum: 0, maximum: 255 },
          },
        },
        positionX: {
          type: "number",
          description: "X position in pixels from left edge",
        },
        positionY: {
          type: "number",
          description: "Y position in pixels from top edge",
        },
        justification: {
          type: "string",
          enum: ["left", "center", "right"],
          description: "Text alignment (default: left)",
        },
      },
      required: ["text"],
    },
    handler: async (bridge, args) => {
      const params = args as {
        text: string;
        fontName?: string;
        fontSize?: number;
        color?: { red: number; green: number; blue: number };
        positionX?: number;
        positionY?: number;
        justification?: string;
      };
      return bridge.send("text.create", {
        text: params.text,
        fontName: params.fontName || "ArialMT",
        fontSize: params.fontSize ?? 24,
        color: params.color || { red: 0, green: 0, blue: 0 },
        positionX: params.positionX ?? 100,
        positionY: params.positionY ?? 100,
        justification: params.justification || "left",
      });
    },
  },

  {
    name: "ps_text_edit_content",
    description: "Change the text content of an existing text layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "ID of the text layer to edit (uses active layer if not specified)",
        },
        text: {
          type: "string",
          description: "New text content",
        },
      },
      required: ["text"],
    },
    handler: async (bridge, args) => {
      const { layerId, text } = args as { layerId?: number; text: string };
      return bridge.send("text.edit_content", { layerId, text });
    },
  },

  {
    name: "ps_text_set_style",
    description: "Change the style (font, size, color) of an existing text layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "ID of the text layer to style (uses active layer if not specified)",
        },
        fontName: {
          type: "string",
          description: "Font PostScript name",
        },
        fontSize: {
          type: "number",
          description: "Font size in points",
        },
        color: {
          type: "object",
          description: "Text color as RGB object",
          properties: {
            red: { type: "number", minimum: 0, maximum: 255 },
            green: { type: "number", minimum: 0, maximum: 255 },
            blue: { type: "number", minimum: 0, maximum: 255 },
          },
        },
        bold: {
          type: "boolean",
          description: "Apply faux bold (if font doesn't have bold variant)",
        },
        italic: {
          type: "boolean",
          description: "Apply faux italic (if font doesn't have italic variant)",
        },
        underline: {
          type: "boolean",
          description: "Add underline to text",
        },
        strikethrough: {
          type: "boolean",
          description: "Add strikethrough to text",
        },
        tracking: {
          type: "number",
          description: "Letter spacing in 1/1000 em (e.g., 50 = slightly loose, -25 = slightly tight)",
        },
        leading: {
          type: "number",
          description: "Line height in points (auto if not specified)",
        },
      },
    },
    handler: async (bridge, args) => {
      const params = args as {
        layerId?: number;
        fontName?: string;
        fontSize?: number;
        color?: { red: number; green: number; blue: number };
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strikethrough?: boolean;
        tracking?: number;
        leading?: number;
      };
      return bridge.send("text.set_style", params);
    },
  },

  {
    name: "ps_text_set_paragraph",
    description: "Set paragraph formatting options for a text layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "ID of the text layer (uses active layer if not specified)",
        },
        justification: {
          type: "string",
          enum: ["left", "center", "right", "justifyLeft", "justifyCenter", "justifyRight", "justifyAll"],
          description: "Text alignment/justification",
        },
        firstLineIndent: {
          type: "number",
          description: "First line indent in points",
        },
        startIndent: {
          type: "number",
          description: "Left/start indent in points",
        },
        endIndent: {
          type: "number",
          description: "Right/end indent in points",
        },
        spaceBefore: {
          type: "number",
          description: "Space before paragraph in points",
        },
        spaceAfter: {
          type: "number",
          description: "Space after paragraph in points",
        },
      },
    },
    handler: async (bridge, args) => {
      return bridge.send("text.set_paragraph", args);
    },
  },

  {
    name: "ps_text_get_fonts",
    description: "Get a list of available fonts on the system",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Optional filter string to search font names (case-insensitive)",
        },
        limit: {
          type: "number",
          description: "Maximum number of fonts to return (default: 50)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { filter, limit } = args as { filter?: string; limit?: number };
      return bridge.send("text.get_fonts", { filter, limit: limit ?? 50 });
    },
  },

  {
    name: "ps_text_warp",
    description: "Apply a warp effect to a text layer",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "ID of the text layer (uses active layer if not specified)",
        },
        style: {
          type: "string",
          enum: ["arc", "arcLower", "arcUpper", "arch", "bulge", "shellLower", "shellUpper", "flag", "wave", "fish", "rise", "fisheye", "inflate", "squeeze", "twist"],
          description: "Warp style to apply",
        },
        bend: {
          type: "number",
          description: "Bend amount (-100 to 100, default: 50)",
          minimum: -100,
          maximum: 100,
        },
        horizontalDistortion: {
          type: "number",
          description: "Horizontal distortion (-100 to 100, default: 0)",
          minimum: -100,
          maximum: 100,
        },
        verticalDistortion: {
          type: "number",
          description: "Vertical distortion (-100 to 100, default: 0)",
          minimum: -100,
          maximum: 100,
        },
      },
      required: ["style"],
    },
    handler: async (bridge, args) => {
      const params = args as {
        layerId?: number;
        style: string;
        bend?: number;
        horizontalDistortion?: number;
        verticalDistortion?: number;
      };
      return bridge.send("text.warp", {
        layerId: params.layerId,
        style: params.style,
        bend: params.bend ?? 50,
        horizontalDistortion: params.horizontalDistortion ?? 0,
        verticalDistortion: params.verticalDistortion ?? 0,
      });
    },
  },

  {
    name: "ps_text_convert_to_shape",
    description: "Convert a text layer to a shape layer (vector paths)",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "ID of the text layer to convert (uses active layer if not specified)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { layerId } = args as { layerId?: number };
      return bridge.send("text.convert_to_shape", { layerId });
    },
  },

  {
    name: "ps_text_rasterize",
    description: "Rasterize a text layer to pixels (cannot be edited as text afterward)",
    inputSchema: {
      type: "object",
      properties: {
        layerId: {
          type: "number",
          description: "ID of the text layer to rasterize (uses active layer if not specified)",
        },
      },
    },
    handler: async (bridge, args) => {
      const { layerId } = args as { layerId?: number };
      return bridge.send("text.rasterize", { layerId });
    },
  },
];

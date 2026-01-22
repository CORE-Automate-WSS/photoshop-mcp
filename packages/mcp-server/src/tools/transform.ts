import { ToolDefinition } from "./registry.js";

/**
 * Transform tools - Scale, Rotate, Flip, and other geometric transformations
 * Based on Adobe UXP documentation
 */
export const transformTools: ToolDefinition[] = [
  {
    name: "ps_transform_scale",
    description: "Scale the active layer by percentage. 100 = original size, 50 = half size, 200 = double size",
    inputSchema: {
      type: "object",
      properties: {
        scaleX: {
          type: "number",
          description: "Horizontal scale percentage (e.g., 100 for no change, 50 for half width)",
        },
        scaleY: {
          type: "number",
          description: "Vertical scale percentage (e.g., 100 for no change, 50 for half height)",
        },
        anchor: {
          type: "string",
          enum: ["topLeft", "topCenter", "topRight", "middleLeft", "middleCenter", "middleRight", "bottomLeft", "bottomCenter", "bottomRight"],
          description: "Anchor point for scaling (default: middleCenter)",
        },
      },
      required: ["scaleX", "scaleY"],
    },
    handler: async (bridge, args) => {
      const { scaleX, scaleY, anchor } = args as {
        scaleX: number;
        scaleY: number;
        anchor?: string;
      };
      return bridge.send("transform.scale", {
        scaleX,
        scaleY,
        anchor: anchor || "middleCenter",
      });
    },
  },

  {
    name: "ps_transform_rotate",
    description: "Rotate the active layer by specified angle in degrees",
    inputSchema: {
      type: "object",
      properties: {
        angle: {
          type: "number",
          description: "Rotation angle in degrees (positive = clockwise, negative = counter-clockwise)",
        },
        anchor: {
          type: "string",
          enum: ["topLeft", "topCenter", "topRight", "middleLeft", "middleCenter", "middleRight", "bottomLeft", "bottomCenter", "bottomRight"],
          description: "Anchor point for rotation (default: middleCenter)",
        },
      },
      required: ["angle"],
    },
    handler: async (bridge, args) => {
      const { angle, anchor } = args as { angle: number; anchor?: string };
      return bridge.send("transform.rotate", {
        angle,
        anchor: anchor || "middleCenter",
      });
    },
  },

  {
    name: "ps_transform_flip_horizontal",
    description: "Flip the active layer horizontally (mirror left-right)",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("transform.flip_horizontal", {});
    },
  },

  {
    name: "ps_transform_flip_vertical",
    description: "Flip the active layer vertically (mirror top-bottom)",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("transform.flip_vertical", {});
    },
  },

  {
    name: "ps_transform_skew",
    description: "Skew/shear the active layer",
    inputSchema: {
      type: "object",
      properties: {
        skewX: {
          type: "number",
          description: "Horizontal skew angle in degrees (-45 to 45)",
        },
        skewY: {
          type: "number",
          description: "Vertical skew angle in degrees (-45 to 45)",
        },
      },
      required: ["skewX", "skewY"],
    },
    handler: async (bridge, args) => {
      const { skewX, skewY } = args as { skewX: number; skewY: number };
      return bridge.send("transform.skew", { skewX, skewY });
    },
  },

  {
    name: "ps_transform_move",
    description: "Move/translate the active layer by specified pixels",
    inputSchema: {
      type: "object",
      properties: {
        deltaX: {
          type: "number",
          description: "Horizontal movement in pixels (positive = right, negative = left)",
        },
        deltaY: {
          type: "number",
          description: "Vertical movement in pixels (positive = down, negative = up)",
        },
      },
      required: ["deltaX", "deltaY"],
    },
    handler: async (bridge, args) => {
      const { deltaX, deltaY } = args as { deltaX: number; deltaY: number };
      return bridge.send("transform.move", { deltaX, deltaY });
    },
  },

  {
    name: "ps_transform_free_transform",
    description: "Apply free transform with multiple parameters at once",
    inputSchema: {
      type: "object",
      properties: {
        scaleX: {
          type: "number",
          description: "Horizontal scale percentage (100 = no change)",
        },
        scaleY: {
          type: "number",
          description: "Vertical scale percentage (100 = no change)",
        },
        angle: {
          type: "number",
          description: "Rotation angle in degrees",
        },
        moveX: {
          type: "number",
          description: "Horizontal offset in pixels",
        },
        moveY: {
          type: "number",
          description: "Vertical offset in pixels",
        },
        skewX: {
          type: "number",
          description: "Horizontal skew in degrees",
        },
        skewY: {
          type: "number",
          description: "Vertical skew in degrees",
        },
        anchor: {
          type: "string",
          enum: ["topLeft", "topCenter", "topRight", "middleLeft", "middleCenter", "middleRight", "bottomLeft", "bottomCenter", "bottomRight"],
          description: "Transform anchor point",
        },
      },
    },
    handler: async (bridge, args) => {
      const params = args as {
        scaleX?: number;
        scaleY?: number;
        angle?: number;
        moveX?: number;
        moveY?: number;
        skewX?: number;
        skewY?: number;
        anchor?: string;
      };
      return bridge.send("transform.free_transform", {
        scaleX: params.scaleX ?? 100,
        scaleY: params.scaleY ?? 100,
        angle: params.angle ?? 0,
        moveX: params.moveX ?? 0,
        moveY: params.moveY ?? 0,
        skewX: params.skewX ?? 0,
        skewY: params.skewY ?? 0,
        anchor: params.anchor || "middleCenter",
      });
    },
  },

  {
    name: "ps_transform_rotate_90_cw",
    description: "Rotate the active layer 90 degrees clockwise",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("transform.rotate_90_cw", {});
    },
  },

  {
    name: "ps_transform_rotate_90_ccw",
    description: "Rotate the active layer 90 degrees counter-clockwise",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("transform.rotate_90_ccw", {});
    },
  },

  {
    name: "ps_transform_rotate_180",
    description: "Rotate the active layer 180 degrees",
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge, _args) => {
      return bridge.send("transform.rotate_180", {});
    },
  },

  {
    name: "ps_canvas_resize",
    description: "Resize the canvas (document) while keeping layer content. Use anchor to control where content is positioned.",
    inputSchema: {
      type: "object",
      properties: {
        width: {
          type: "number",
          description: "New canvas width in pixels",
        },
        height: {
          type: "number",
          description: "New canvas height in pixels",
        },
        anchor: {
          type: "string",
          enum: ["topLeft", "topCenter", "topRight", "middleLeft", "middleCenter", "middleRight", "bottomLeft", "bottomCenter", "bottomRight"],
          description: "Anchor position for existing content (default: middleCenter)",
        },
      },
      required: ["width", "height"],
    },
    handler: async (bridge, args) => {
      const { width, height, anchor } = args as {
        width: number;
        height: number;
        anchor?: string;
      };
      return bridge.send("canvas.resize", {
        width,
        height,
        anchor: anchor || "middleCenter",
      });
    },
  },

  {
    name: "ps_image_resize",
    description: "Resize the entire image (all layers scaled proportionally)",
    inputSchema: {
      type: "object",
      properties: {
        width: {
          type: "number",
          description: "New width in pixels (leave empty to auto-calculate from height)",
        },
        height: {
          type: "number",
          description: "New height in pixels (leave empty to auto-calculate from width)",
        },
        resampleMethod: {
          type: "string",
          enum: ["nearestNeighbor", "bilinear", "bicubic", "bicubicSmoother", "bicubicSharper", "automaticInterpolation"],
          description: "Resampling method for scaling (default: bicubicAutomatic)",
        },
        constrainProportions: {
          type: "boolean",
          description: "Maintain aspect ratio (default: true)",
        },
      },
    },
    handler: async (bridge, args) => {
      const params = args as {
        width?: number;
        height?: number;
        resampleMethod?: string;
        constrainProportions?: boolean;
      };
      return bridge.send("image.resize", {
        width: params.width,
        height: params.height,
        resampleMethod: params.resampleMethod || "bicubicAutomatic",
        constrainProportions: params.constrainProportions !== false,
      });
    },
  },

  {
    name: "ps_crop",
    description: "Crop the document to specified bounds",
    inputSchema: {
      type: "object",
      properties: {
        top: {
          type: "number",
          description: "Top edge of crop area in pixels",
        },
        left: {
          type: "number",
          description: "Left edge of crop area in pixels",
        },
        bottom: {
          type: "number",
          description: "Bottom edge of crop area in pixels",
        },
        right: {
          type: "number",
          description: "Right edge of crop area in pixels",
        },
      },
      required: ["top", "left", "bottom", "right"],
    },
    handler: async (bridge, args) => {
      const { top, left, bottom, right } = args as {
        top: number;
        left: number;
        bottom: number;
        right: number;
      };
      return bridge.send("image.crop", { top, left, bottom, right });
    },
  },

  {
    name: "ps_trim",
    description: "Trim transparent pixels or a specific color from the edges of the image",
    inputSchema: {
      type: "object",
      properties: {
        trimType: {
          type: "string",
          enum: ["transparent", "topLeftPixelColor", "bottomRightPixelColor"],
          description: "What to trim: transparent pixels or pixels matching a corner color",
        },
        trimTop: {
          type: "boolean",
          description: "Trim from top edge (default: true)",
        },
        trimLeft: {
          type: "boolean",
          description: "Trim from left edge (default: true)",
        },
        trimBottom: {
          type: "boolean",
          description: "Trim from bottom edge (default: true)",
        },
        trimRight: {
          type: "boolean",
          description: "Trim from right edge (default: true)",
        },
      },
      required: ["trimType"],
    },
    handler: async (bridge, args) => {
      const params = args as {
        trimType: string;
        trimTop?: boolean;
        trimLeft?: boolean;
        trimBottom?: boolean;
        trimRight?: boolean;
      };
      return bridge.send("image.trim", {
        trimType: params.trimType,
        trimTop: params.trimTop !== false,
        trimLeft: params.trimLeft !== false,
        trimBottom: params.trimBottom !== false,
        trimRight: params.trimRight !== false,
      });
    },
  },
];

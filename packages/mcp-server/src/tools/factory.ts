/**
 * Tool Factory
 *
 * Utility functions for creating tool definitions with consistent patterns
 * and Zod validation.
 */

import { z, ZodObject, ZodRawShape } from "zod";
import type {
  ToolDefinition,
  PhotoshopBridge,
  ToolResponse,
} from "./registry.js";

// Use zod-to-json-schema approach with manual conversion
// This avoids accessing Zod internals directly

type JsonSchemaProperty = {
  type: string;
  description?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  enum?: string[];
  default?: unknown;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
};

/**
 * Convert a Zod schema to JSON Schema for MCP tool definitions.
 * This is a simplified converter that handles common Zod types.
 */
function zodToJsonSchema(schema: ZodObject<ZodRawShape>): {
  type: "object";
  properties: Record<string, object>;
  required?: string[];
} {
  const shape = schema.shape;
  const properties: Record<string, object> = {};
  const required: string[] = [];

  for (const [key, zodField] of Object.entries(shape)) {
    const result = convertZodField(zodField as z.ZodTypeAny);
    properties[key] = result.schema;
    if (!result.optional) {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 && { required }),
  };
}

/**
 * Convert a single Zod field to JSON Schema property
 */
function convertZodField(field: z.ZodTypeAny): {
  schema: JsonSchemaProperty;
  optional: boolean;
} {
  // Handle the field by checking its constructor name or using describe
  const def = field._def as Record<string, unknown>;
  const typeName = def.typeName as string | undefined;

  let optional = false;
  let innerField = field;

  // Unwrap optional
  if (typeName === "ZodOptional") {
    optional = true;
    innerField = (def.innerType as z.ZodTypeAny) ?? field;
  }

  // Unwrap default (also makes it optional for required array)
  const innerDef = innerField._def as Record<string, unknown>;
  const innerTypeName = innerDef.typeName as string | undefined;

  if (innerTypeName === "ZodDefault") {
    optional = true;
    innerField = (innerDef.innerType as z.ZodTypeAny) ?? innerField;
  }

  // Get final type info
  const finalDef = innerField._def as Record<string, unknown>;
  const finalTypeName = finalDef.typeName as string | undefined;

  let schema: JsonSchemaProperty = { type: "string" };

  switch (finalTypeName) {
    case "ZodString":
      schema = { type: "string" };
      break;

    case "ZodNumber":
      schema = { type: "number" };
      // Check for min/max
      const checks = finalDef.checks as Array<{ kind: string; value: number }> | undefined;
      if (checks) {
        for (const check of checks) {
          if (check.kind === "min") schema.minimum = check.value;
          if (check.kind === "max") schema.maximum = check.value;
        }
      }
      break;

    case "ZodBoolean":
      schema = { type: "boolean" };
      break;

    case "ZodEnum":
      schema = {
        type: "string",
        enum: finalDef.values as string[],
      };
      break;

    case "ZodArray":
      const itemType = finalDef.type as z.ZodTypeAny;
      schema = {
        type: "array",
        items: convertZodField(itemType).schema,
      };
      break;

    case "ZodObject":
      const objSchema = zodToJsonSchema(innerField as ZodObject<ZodRawShape>);
      schema = {
        type: "object",
        properties: objSchema.properties as Record<string, JsonSchemaProperty>,
        ...(objSchema.required && { required: objSchema.required }),
      };
      break;

    default:
      schema = { type: "string" };
  }

  // Add description if present
  if (innerField.description) {
    schema.description = innerField.description;
  }

  return { schema, optional };
}

/**
 * Create a tool that validates input with Zod and forwards to bridge
 */
export function createTool<T extends ZodRawShape>(
  name: string,
  description: string,
  schema: ZodObject<T>,
  command: string,
  options?: {
    /** Transform args before sending to bridge */
    transform?: (args: z.infer<ZodObject<T>>) => Record<string, unknown>;
  }
): ToolDefinition {
  return {
    name,
    description,
    inputSchema: zodToJsonSchema(schema),
    handler: async (
      bridge: PhotoshopBridge,
      args: Record<string, unknown>
    ): Promise<ToolResponse> => {
      // Validate input with Zod
      const parseResult = schema.safeParse(args);
      if (!parseResult.success) {
        const errors = parseResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        return {
          ok: false,
          changed: false,
          error: `Validation failed: ${errors}`,
        };
      }

      // Transform if needed, otherwise use parsed data
      const params = options?.transform
        ? options.transform(parseResult.data)
        : (parseResult.data as Record<string, unknown>);

      // Send to bridge
      return bridge.send(command, params);
    },
  };
}

/**
 * Create a tool with no input parameters
 */
export function createSimpleTool(
  name: string,
  description: string,
  command: string
): ToolDefinition {
  return {
    name,
    description,
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async (bridge: PhotoshopBridge): Promise<ToolResponse> => {
      return bridge.send(command, {});
    },
  };
}

// Re-export zod for convenience
export { z };

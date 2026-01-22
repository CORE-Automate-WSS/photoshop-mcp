import { describe, it, expect, vi } from "vitest";
import { createTool, createSimpleTool, z } from "./factory.js";
import type { PhotoshopBridge, ToolResponse } from "./registry.js";

// Mock bridge
const createMockBridge = (response?: Partial<ToolResponse>): PhotoshopBridge => ({
  isConnected: () => true,
  send: vi.fn().mockResolvedValue({
    ok: true,
    changed: true,
    data: { test: "data" },
    ...response,
  }),
});

describe("createSimpleTool", () => {
  it("should create a tool with no parameters", () => {
    const tool = createSimpleTool(
      "ps_test_simple",
      "A simple test tool",
      "test.simple"
    );

    expect(tool.name).toBe("ps_test_simple");
    expect(tool.description).toBe("A simple test tool");
    expect(tool.inputSchema).toEqual({
      type: "object",
      properties: {},
    });
  });

  it("should call bridge.send with correct command", async () => {
    const tool = createSimpleTool("ps_test", "Test", "test.command");
    const bridge = createMockBridge();

    await tool.handler(bridge, {});

    expect(bridge.send).toHaveBeenCalledWith("test.command", {});
  });
});

describe("createTool", () => {
  const testSchema = z.object({
    name: z.string().describe("The name"),
    count: z.number().min(0).max(100).describe("A count value"),
    enabled: z.boolean().optional().describe("Whether enabled"),
  });

  it("should create a tool with Zod schema", () => {
    const tool = createTool(
      "ps_test_validated",
      "A validated test tool",
      testSchema,
      "test.validated"
    );

    expect(tool.name).toBe("ps_test_validated");
    expect(tool.description).toBe("A validated test tool");
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.inputSchema.properties).toHaveProperty("name");
    expect(tool.inputSchema.properties).toHaveProperty("count");
    expect(tool.inputSchema.properties).toHaveProperty("enabled");
    expect(tool.inputSchema.required).toContain("name");
    expect(tool.inputSchema.required).toContain("count");
    expect(tool.inputSchema.required).not.toContain("enabled");
  });

  it("should validate input and reject invalid data", async () => {
    const tool = createTool("ps_test", "Test", testSchema, "test.cmd");
    const bridge = createMockBridge();

    // Missing required field
    const result = await tool.handler(bridge, { count: 50 });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(bridge.send).not.toHaveBeenCalled();
  });

  it("should validate input and reject out-of-range values", async () => {
    const tool = createTool("ps_test", "Test", testSchema, "test.cmd");
    const bridge = createMockBridge();

    // Count out of range
    const result = await tool.handler(bridge, { name: "test", count: 150 });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(bridge.send).not.toHaveBeenCalled();
  });

  it("should pass valid data to bridge", async () => {
    const tool = createTool("ps_test", "Test", testSchema, "test.cmd");
    const bridge = createMockBridge();

    const result = await tool.handler(bridge, {
      name: "myName",
      count: 50,
      enabled: true,
    });

    expect(result.ok).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith("test.cmd", {
      name: "myName",
      count: 50,
      enabled: true,
    });
  });

  it("should handle default values", async () => {
    const schemaWithDefault = z.object({
      value: z.number().default(42),
    });
    const tool = createTool("ps_test", "Test", schemaWithDefault, "test.cmd");
    const bridge = createMockBridge();

    // Call without providing value - should use default
    const result = await tool.handler(bridge, {});

    expect(result.ok).toBe(true);
    expect(bridge.send).toHaveBeenCalledWith("test.cmd", { value: 42 });
  });

  it("should apply transform function if provided", async () => {
    const schema = z.object({
      red: z.number(),
      green: z.number(),
      blue: z.number(),
    });

    const tool = createTool("ps_test", "Test", schema, "test.cmd", {
      transform: (args) => ({
        color: {
          red: args.red,
          grain: args.green, // Photoshop quirk
          blue: args.blue,
        },
      }),
    });
    const bridge = createMockBridge();

    await tool.handler(bridge, { red: 255, green: 128, blue: 0 });

    expect(bridge.send).toHaveBeenCalledWith("test.cmd", {
      color: { red: 255, grain: 128, blue: 0 },
    });
  });
});

describe("JSON Schema generation", () => {
  it("should generate correct schema for string type", () => {
    const schema = z.object({
      name: z.string().describe("A name field"),
    });
    const tool = createTool("ps_test", "Test", schema, "test.cmd");

    expect(tool.inputSchema.properties.name).toEqual({
      type: "string",
      description: "A name field",
    });
  });

  it("should generate correct schema for number with constraints", () => {
    const schema = z.object({
      opacity: z.number().min(0).max(100).describe("Opacity value"),
    });
    const tool = createTool("ps_test", "Test", schema, "test.cmd");

    expect(tool.inputSchema.properties.opacity).toEqual({
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Opacity value",
    });
  });

  it("should generate correct schema for boolean", () => {
    const schema = z.object({
      visible: z.boolean().describe("Visibility flag"),
    });
    const tool = createTool("ps_test", "Test", schema, "test.cmd");

    expect(tool.inputSchema.properties.visible).toEqual({
      type: "boolean",
      description: "Visibility flag",
    });
  });

  it("should generate correct schema for enum", () => {
    const schema = z.object({
      format: z.enum(["psd", "png", "jpg"]).describe("File format"),
    });
    const tool = createTool("ps_test", "Test", schema, "test.cmd");

    expect(tool.inputSchema.properties.format).toEqual({
      type: "string",
      enum: ["psd", "png", "jpg"],
      description: "File format",
    });
  });

  it("should mark optional fields correctly", () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
      withDefault: z.number().default(10),
    });
    const tool = createTool("ps_test", "Test", schema, "test.cmd");

    expect(tool.inputSchema.required).toContain("required");
    expect(tool.inputSchema.required).not.toContain("optional");
    expect(tool.inputSchema.required).not.toContain("withDefault");
  });
});

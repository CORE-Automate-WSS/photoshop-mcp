import { describe, it, expect, vi } from "vitest";
import { layerTools } from "./layer.js";
import type { PhotoshopBridge, ToolResponse } from "./registry.js";

// Mock bridge
const createMockBridge = (response?: Partial<ToolResponse>): PhotoshopBridge => ({
  isConnected: () => true,
  send: vi.fn().mockResolvedValue({
    ok: true,
    changed: true,
    data: { layerId: 1 },
    ...response,
  }),
});

// Helper to find tool by name
const findTool = (name: string) => {
  const tool = layerTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
};

describe("Layer Tools", () => {
  describe("ps_layer_create", () => {
    it("should create a layer with default values", async () => {
      const tool = findTool("ps_layer_create");
      const bridge = createMockBridge();

      const result = await tool.handler(bridge, {});

      expect(result.ok).toBe(true);
      expect(bridge.send).toHaveBeenCalledWith("layer.create", {});
    });

    it("should pass all optional parameters", async () => {
      const tool = findTool("ps_layer_create");
      const bridge = createMockBridge();

      await tool.handler(bridge, {
        name: "My Layer",
        opacity: 75,
        blendMode: "multiply",
      });

      expect(bridge.send).toHaveBeenCalledWith("layer.create", {
        name: "My Layer",
        opacity: 75,
        blendMode: "multiply",
      });
    });

    it("should reject invalid opacity values", async () => {
      const tool = findTool("ps_layer_create");
      const bridge = createMockBridge();

      const result = await tool.handler(bridge, { opacity: 150 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Validation failed");
    });
  });

  describe("ps_layer_delete", () => {
    it("should require layerId", async () => {
      const tool = findTool("ps_layer_delete");
      const bridge = createMockBridge();

      const result = await tool.handler(bridge, {});

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Validation failed");
    });

    it("should delete layer with valid id", async () => {
      const tool = findTool("ps_layer_delete");
      const bridge = createMockBridge();

      const result = await tool.handler(bridge, { layerId: 5 });

      expect(result.ok).toBe(true);
      expect(bridge.send).toHaveBeenCalledWith("layer.delete", { layerId: 5 });
    });
  });

  describe("ps_layer_set_opacity", () => {
    it("should require both layerId and opacity", async () => {
      const tool = findTool("ps_layer_set_opacity");
      const bridge = createMockBridge();

      // Missing opacity
      let result = await tool.handler(bridge, { layerId: 1 });
      expect(result.ok).toBe(false);

      // Missing layerId
      result = await tool.handler(bridge, { opacity: 50 });
      expect(result.ok).toBe(false);
    });

    it("should validate opacity range 0-100", async () => {
      const tool = findTool("ps_layer_set_opacity");
      const bridge = createMockBridge();

      // Too high
      let result = await tool.handler(bridge, { layerId: 1, opacity: 101 });
      expect(result.ok).toBe(false);

      // Too low
      result = await tool.handler(bridge, { layerId: 1, opacity: -1 });
      expect(result.ok).toBe(false);

      // Valid
      result = await tool.handler(bridge, { layerId: 1, opacity: 50 });
      expect(result.ok).toBe(true);
    });
  });

  describe("ps_layer_rename", () => {
    it("should require layerId and name", async () => {
      const tool = findTool("ps_layer_rename");
      const bridge = createMockBridge();

      const result = await tool.handler(bridge, { layerId: 1 });

      expect(result.ok).toBe(false);
      expect(result.error).toContain("Validation failed");
    });

    it("should rename layer with valid params", async () => {
      const tool = findTool("ps_layer_rename");
      const bridge = createMockBridge();

      const result = await tool.handler(bridge, {
        layerId: 3,
        name: "New Name",
      });

      expect(result.ok).toBe(true);
      expect(bridge.send).toHaveBeenCalledWith("layer.rename", {
        layerId: 3,
        name: "New Name",
      });
    });
  });

  describe("ps_layer_list", () => {
    it("should have default includeHidden = true", async () => {
      const tool = findTool("ps_layer_list");
      const bridge = createMockBridge();

      await tool.handler(bridge, {});

      expect(bridge.send).toHaveBeenCalledWith("layer.list", {
        includeHidden: true,
      });
    });

    it("should allow overriding includeHidden", async () => {
      const tool = findTool("ps_layer_list");
      const bridge = createMockBridge();

      await tool.handler(bridge, { includeHidden: false });

      expect(bridge.send).toHaveBeenCalledWith("layer.list", {
        includeHidden: false,
      });
    });
  });
});

describe("Layer Tools - Input Schema", () => {
  it("all tools should have valid inputSchema", () => {
    for (const tool of layerTools) {
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it("ps_layer_set_visibility should require layerId and visible", () => {
    const tool = findTool("ps_layer_set_visibility");
    expect(tool.inputSchema.required).toContain("layerId");
    expect(tool.inputSchema.required).toContain("visible");
  });

  it("ps_layer_duplicate should require layerId", () => {
    const tool = findTool("ps_layer_duplicate");
    expect(tool.inputSchema.required).toContain("layerId");
    expect(tool.inputSchema.required).not.toContain("name");
  });
});

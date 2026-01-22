/**
 * Photoshop MCP Bridge - UXP Plugin Main Entry
 *
 * This plugin runs inside Photoshop and acts as a bridge between
 * the external MCP server and Photoshop's internal APIs.
 */

const photoshop = require("photoshop");
const { app, core } = photoshop;
const { executeAsModal } = core;

// Command handlers - inline to avoid require path issues
const commands = {};

// App commands
commands["app.get_info"] = async function () {
  // In UXP, use photoshop.app for application info
  const psApp = require("photoshop").app;

  return {
    ok: true,
    changed: false,
    data: {
      name: "Adobe Photoshop",
      version: psApp.version || "unknown",
      platform: require("os").platform(),
      activeDocumentName: psApp.activeDocument?.name || null,
      documentsCount: psApp.documents?.length || 0,
    },
  };
};

// Document commands
commands["doc.get_active"] = async function () {
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: "No active document",
    };
  }

  return {
    ok: true,
    changed: false,
    data: {
      id: doc.id,
      name: doc.name,
      path: doc.path || null,
      width: doc.width,
      height: doc.height,
      resolution: doc.resolution,
      mode: doc.mode,
      colorProfile: doc.colorProfileName || null,
      bitsPerChannel: doc.bitsPerChannel,
      layerCount: doc.layers?.length || 0,
    },
  };
};

// Layer commands
commands["layer.list"] = async function (params) {
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: "No active document",
    };
  }

  const includeHidden = params.includeHidden !== false;

  function collectLayers(layers) {
    const result = [];
    for (const layer of layers) {
      if (!includeHidden && !layer.visible) continue;
      result.push({
        id: layer.id,
        name: layer.name,
        kind: layer.kind,
        visible: layer.visible,
        opacity: layer.opacity,
        blendMode: layer.blendMode,
        locked: layer.locked,
        isGroup: layer.kind === "group",
      });
      if (layer.layers && layer.layers.length > 0) {
        result.push(...collectLayers(layer.layers));
      }
    }
    return result;
  }

  const layers = collectLayers(doc.layers);

  return {
    ok: true,
    changed: false,
    data: {
      documentId: doc.id,
      layerCount: layers.length,
      layers,
    },
  };
};

// Layer select
commands["layer.select"] = async function (params) {
  const { layerId } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }
  if (layerId === undefined) {
    return { ok: false, changed: false, error: "layerId is required" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "select",
              _target: [{ _ref: "layer", _id: layerId }],
              makeVisible: false,
            },
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Select Layer" }
    );

    return { ok: true, changed: true, data: { selectedLayerId: layerId } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to select layer: ${error.message}` };
  }
};

// Layer rename
commands["layer.rename"] = async function (params) {
  const { layerId, name } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }
  if (layerId === undefined || !name) {
    return { ok: false, changed: false, error: "layerId and name are required" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "set",
              _target: [{ _ref: "layer", _id: layerId }],
              to: { _obj: "layer", name: name },
            },
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Rename Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to rename layer: ${error.message}` };
  }
};

// Layer set visibility
commands["layer.set_visibility"] = async function (params) {
  const { layerId, visible } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }
  if (layerId === undefined || visible === undefined) {
    return { ok: false, changed: false, error: "layerId and visible are required" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    await executeAsModal(
      async () => {
        const command = visible ? "show" : "hide";
        await batchPlay(
          [
            {
              _obj: command,
              null: [{ _ref: "layer", _id: layerId }],
            },
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: visible ? "Show Layer" : "Hide Layer" }
    );

    return { ok: true, changed: true, data: { layerId, visible } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to set visibility: ${error.message}` };
  }
};

// Layer set opacity
commands["layer.set_opacity"] = async function (params) {
  const { layerId, opacity } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }
  if (layerId === undefined || opacity === undefined) {
    return { ok: false, changed: false, error: "layerId and opacity are required" };
  }
  if (opacity < 0 || opacity > 100) {
    return { ok: false, changed: false, error: "opacity must be between 0 and 100" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "set",
              _target: [{ _ref: "layer", _id: layerId }],
              to: {
                _obj: "layer",
                opacity: { _unit: "percentUnit", _value: opacity },
              },
            },
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Set Layer Opacity" }
    );

    return { ok: true, changed: true, data: { layerId, opacity } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to set opacity: ${error.message}` };
  }
};

// ============================================
// Layer Creation Commands (DOM API)
// ============================================

commands["layer.create"] = async function (params) {
  const { name, opacity, blendMode } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    let newLayer;
    await executeAsModal(
      async () => {
        const options = {};
        if (name) options.name = name;
        if (opacity !== undefined) options.opacity = opacity;
        if (blendMode) options.blendMode = blendMode;

        newLayer = await doc.createLayer(options);
      },
      { commandName: "Create Layer" }
    );

    return {
      ok: true,
      changed: true,
      data: {
        layerId: newLayer.id,
        name: newLayer.name,
        opacity: newLayer.opacity,
        blendMode: newLayer.blendMode,
      },
    };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create layer: ${error.message}` };
  }
};

commands["layer.duplicate"] = async function (params) {
  const { layerId, name } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }
  if (layerId === undefined) {
    return { ok: false, changed: false, error: "layerId is required" };
  }

  try {
    // Find the layer by ID
    const findLayer = (layers, id) => {
      for (const layer of layers) {
        if (layer.id === id) return layer;
        if (layer.layers) {
          const found = findLayer(layer.layers, id);
          if (found) return found;
        }
      }
      return null;
    };

    const sourceLayer = findLayer(doc.layers, layerId);
    if (!sourceLayer) {
      return { ok: false, changed: false, error: `Layer with ID ${layerId} not found` };
    }

    let duplicatedLayer;
    await executeAsModal(
      async () => {
        duplicatedLayer = await sourceLayer.duplicate();
        if (name) {
          duplicatedLayer.name = name;
        }
      },
      { commandName: "Duplicate Layer" }
    );

    return {
      ok: true,
      changed: true,
      data: {
        layerId: duplicatedLayer.id,
        name: duplicatedLayer.name,
        sourceLayerId: layerId,
      },
    };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to duplicate layer: ${error.message}` };
  }
};

commands["layer.delete"] = async function (params) {
  const { layerId } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }
  if (layerId === undefined) {
    return { ok: false, changed: false, error: "layerId is required" };
  }

  try {
    const findLayer = (layers, id) => {
      for (const layer of layers) {
        if (layer.id === id) return layer;
        if (layer.layers) {
          const found = findLayer(layer.layers, id);
          if (found) return found;
        }
      }
      return null;
    };

    const layer = findLayer(doc.layers, layerId);
    if (!layer) {
      return { ok: false, changed: false, error: `Layer with ID ${layerId} not found` };
    }

    const layerName = layer.name;
    await executeAsModal(
      async () => {
        await layer.delete();
      },
      { commandName: "Delete Layer" }
    );

    return {
      ok: true,
      changed: true,
      data: { deletedLayerId: layerId, deletedLayerName: layerName },
    };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to delete layer: ${error.message}` };
  }
};

commands["layer.group_create"] = async function (params) {
  const { name } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    let newGroup;
    await executeAsModal(
      async () => {
        newGroup = await doc.createLayerGroup({ name: name || "New Group" });
      },
      { commandName: "Create Layer Group" }
    );

    return {
      ok: true,
      changed: true,
      data: {
        groupId: newGroup.id,
        name: newGroup.name,
      },
    };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create group: ${error.message}` };
  }
};

// ============================================
// Selection Commands (DOM API)
// ============================================

commands["selection.select_all"] = async function () {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.selectAll();
      },
      { commandName: "Select All" }
    );
    return { ok: true, changed: true, data: { selection: "all" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to select all: ${error.message}` };
  }
};

commands["selection.deselect"] = async function () {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.deselect();
      },
      { commandName: "Deselect" }
    );
    return { ok: true, changed: true, data: { selection: "none" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to deselect: ${error.message}` };
  }
};

commands["selection.inverse"] = async function () {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.inverse();
      },
      { commandName: "Inverse Selection" }
    );
    return { ok: true, changed: true, data: { selection: "inversed" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to inverse selection: ${error.message}` };
  }
};

commands["selection.select_rectangle"] = async function (params) {
  const { top, left, bottom, right, feather = 0 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.selectRectangle(
          { top, left, bottom, right },
          feather > 0 ? { featherRadius: feather } : undefined
        );
      },
      { commandName: "Select Rectangle" }
    );
    return { ok: true, changed: true, data: { bounds: { top, left, bottom, right }, feather } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to select rectangle: ${error.message}` };
  }
};

commands["selection.select_ellipse"] = async function (params) {
  const { top, left, bottom, right, feather = 0 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.selectEllipse(
          { top, left, bottom, right },
          feather > 0 ? { featherRadius: feather } : undefined
        );
      },
      { commandName: "Select Ellipse" }
    );
    return { ok: true, changed: true, data: { bounds: { top, left, bottom, right }, feather } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to select ellipse: ${error.message}` };
  }
};

commands["selection.expand"] = async function (params) {
  const { pixels } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.expand(pixels);
      },
      { commandName: "Expand Selection" }
    );
    return { ok: true, changed: true, data: { expanded: pixels } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to expand selection: ${error.message}` };
  }
};

commands["selection.contract"] = async function (params) {
  const { pixels } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.contract(pixels);
      },
      { commandName: "Contract Selection" }
    );
    return { ok: true, changed: true, data: { contracted: pixels } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to contract selection: ${error.message}` };
  }
};

commands["selection.feather"] = async function (params) {
  const { radius } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.feather(radius);
      },
      { commandName: "Feather Selection" }
    );
    return { ok: true, changed: true, data: { featherRadius: radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to feather selection: ${error.message}` };
  }
};

commands["selection.grow"] = async function (params) {
  const { tolerance } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.selection.grow(tolerance);
      },
      { commandName: "Grow Selection" }
    );
    return { ok: true, changed: true, data: { tolerance } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to grow selection: ${error.message}` };
  }
};

commands["selection.get_bounds"] = async function () {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const bounds = doc.selection.bounds;
    if (!bounds) {
      return { ok: true, changed: false, data: { hasSelection: false, bounds: null } };
    }
    return {
      ok: true,
      changed: false,
      data: {
        hasSelection: true,
        bounds: {
          top: bounds.top,
          left: bounds.left,
          bottom: bounds.bottom,
          right: bounds.right,
          width: bounds.right - bounds.left,
          height: bounds.bottom - bounds.top,
        },
      },
    };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to get selection bounds: ${error.message}` };
  }
};

// ============================================
// Select Subject (batchPlay - AI Selection)
// ============================================

commands["selection.select_subject"] = async function (params) {
  const { sampleAllLayers = false } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "autoCutout",
              sampleAllLayers: sampleAllLayers,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Select Subject" }
    );

    return { ok: true, changed: true, data: { selection: "subject" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to select subject: ${error.message}` };
  }
};

// ============================================
// Adjustment Layers (batchPlay)
// ============================================

commands["adjust.curves"] = async function (params) {
  const { name, points, channel = "composite" } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    // Build curve points array
    const curvePoints = points && points.length > 0
      ? points.map(p => ({ _obj: "paint", horizontal: p.input, vertical: p.output }))
      : [
          { _obj: "paint", horizontal: 0, vertical: 0 },
          { _obj: "paint", horizontal: 255, vertical: 255 }
        ];

    let layerId;
    await executeAsModal(
      async () => {
        const result = await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Curves",
                type: {
                  _obj: "curves",
                  presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
                  adjustment: [
                    {
                      _obj: "curvesAdjustment",
                      channel: { _ref: "channel", _enum: "channel", _value: channel },
                      curve: curvePoints
                    }
                  ]
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Curves Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Curves" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create curves layer: ${error.message}` };
  }
};

commands["adjust.levels"] = async function (params) {
  const { name, inputBlack = 0, inputWhite = 255, gamma = 1.0, outputBlack = 0, outputWhite = 255 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Levels",
                type: {
                  _obj: "levels",
                  presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
                  adjustment: [
                    {
                      _obj: "levelsAdjustment",
                      channel: { _ref: "channel", _enum: "channel", _value: "composite" },
                      input: [inputBlack, inputWhite],
                      gamma: gamma,
                      output: [outputBlack, outputWhite]
                    }
                  ]
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Levels Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Levels" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create levels layer: ${error.message}` };
  }
};

commands["adjust.hue_saturation"] = async function (params) {
  const { name, hue = 0, saturation = 0, lightness = 0, colorize = false } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Hue/Saturation",
                type: {
                  _obj: "hueSaturation",
                  presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
                  colorize: colorize,
                  adjustment: [
                    {
                      _obj: "hueSatAdjustmentV2",
                      hue: hue,
                      saturation: saturation,
                      lightness: lightness
                    }
                  ]
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Hue/Saturation Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Hue/Saturation" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create hue/saturation layer: ${error.message}` };
  }
};

commands["adjust.brightness_contrast"] = async function (params) {
  const { name, brightness = 0, contrast = 0, useLegacy = false } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Brightness/Contrast",
                type: {
                  _obj: "brightnessEvent",
                  brightness: brightness,
                  contrast: contrast,
                  useLegacy: useLegacy
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Brightness/Contrast Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Brightness/Contrast" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create brightness/contrast layer: ${error.message}` };
  }
};

commands["adjust.vibrance"] = async function (params) {
  const { name, vibrance = 0, saturation = 0 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Vibrance",
                type: {
                  _obj: "vibrance",
                  vibrance: vibrance,
                  saturation: saturation
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Vibrance Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Vibrance" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create vibrance layer: ${error.message}` };
  }
};

commands["adjust.color_balance"] = async function (params) {
  const { name, shadows = [0,0,0], midtones = [0,0,0], highlights = [0,0,0], preserveLuminosity = true } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Color Balance",
                type: {
                  _obj: "colorBalance",
                  shadowLevels: shadows,
                  midtoneLevels: midtones,
                  highlightLevels: highlights,
                  preserveLuminosity: preserveLuminosity
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Color Balance Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Color Balance" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create color balance layer: ${error.message}` };
  }
};

commands["adjust.black_white"] = async function (params) {
  const { name, red = 40, yellow = 60, green = 40, cyan = 60, blue = 20, magenta = 80 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Black & White",
                type: {
                  _obj: "blackAndWhite",
                  presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
                  red: red,
                  yellow: yellow,
                  grain: green, // Note: Photoshop uses "grain" for green
                  cyan: cyan,
                  blue: blue,
                  magenta: magenta,
                  useTint: false
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Black & White Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Black & White" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create black & white layer: ${error.message}` };
  }
};

commands["adjust.exposure"] = async function (params) {
  const { name, exposure = 0, offset = 0, gamma = 1.0 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Exposure",
                type: {
                  _obj: "exposure",
                  presetKind: { _enum: "presetKindType", _value: "presetKindCustom" },
                  exposure: exposure,
                  offset: offset,
                  gammaCorrection: gamma
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Exposure Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Exposure" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create exposure layer: ${error.message}` };
  }
};

commands["adjust.invert"] = async function (params) {
  const { name } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Invert",
                type: { _class: "invert" }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Invert Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Invert" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create invert layer: ${error.message}` };
  }
};

commands["adjust.posterize"] = async function (params) {
  const { name, levels = 4 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Posterize",
                type: {
                  _obj: "posterization",
                  levels: levels
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Posterize Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Posterize" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create posterize layer: ${error.message}` };
  }
};

commands["adjust.threshold"] = async function (params) {
  const { name, level = 128 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Threshold",
                type: {
                  _obj: "thresholdClassEvent",
                  level: level
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Threshold Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Threshold" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create threshold layer: ${error.message}` };
  }
};

commands["adjust.photo_filter"] = async function (params) {
  const { name, color = { red: 236, green: 138, blue: 0 }, density = 25, preserveLuminosity = true } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "adjustmentLayer" }],
              using: {
                _obj: "adjustmentLayer",
                name: name || "Photo Filter",
                type: {
                  _obj: "photoFilter",
                  color: {
                    _obj: "RGBColor",
                    red: color.red,
                    grain: color.green, // Note: Photoshop uses "grain" for green
                    blue: color.blue
                  },
                  density: density,
                  preserveLuminosity: preserveLuminosity
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Photo Filter Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Photo Filter" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create photo filter layer: ${error.message}` };
  }
};

commands["fill.solid_color"] = async function (params) {
  const { name, color } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }
  if (!color) {
    return { ok: false, changed: false, error: "color is required" };
  }

  try {
    const { batchPlay } = require("photoshop").action;

    let layerId;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "contentLayer" }],
              using: {
                _obj: "contentLayer",
                name: name || "Color Fill",
                type: {
                  _obj: "solidColorLayer",
                  color: {
                    _obj: "RGBColor",
                    red: color.red,
                    grain: color.green,
                    blue: color.blue
                  }
                }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Solid Color Layer" }
    );

    return { ok: true, changed: true, data: { layerId, name: name || "Color Fill", color } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create solid color layer: ${error.message}` };
  }
};

// ============================================================================
// History Commands (batchPlay)
// ============================================================================

commands["history.undo"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "select",
              _target: [
                {
                  _ref: "historyState",
                  _enum: "ordinal",
                  _value: "previous"
                }
              ],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Undo" }
    );

    return { ok: true, changed: true, data: { action: "undo" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to undo: ${error.message}` };
  }
};

commands["history.redo"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "select",
              _target: [
                {
                  _ref: "historyState",
                  _enum: "ordinal",
                  _value: "next"
                }
              ],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Redo" }
    );

    return { ok: true, changed: true, data: { action: "redo" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to redo: ${error.message}` };
  }
};

commands["history.step_backward"] = async function (params) {
  const { steps = 1 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        for (let i = 0; i < steps; i++) {
          await batchPlay(
            [
              {
                _obj: "select",
                _target: [
                  {
                    _ref: "historyState",
                    _enum: "ordinal",
                    _value: "previous"
                  }
                ],
                _options: { dialogOptions: "dontDisplay" }
              }
            ],
            { synchronousExecution: true }
          );
        }
      },
      { commandName: "Step Backward" }
    );

    return { ok: true, changed: true, data: { action: "step_backward", steps } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to step backward: ${error.message}` };
  }
};

commands["history.step_forward"] = async function (params) {
  const { steps = 1 } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        for (let i = 0; i < steps; i++) {
          await batchPlay(
            [
              {
                _obj: "select",
                _target: [
                  {
                    _ref: "historyState",
                    _enum: "ordinal",
                    _value: "next"
                  }
                ],
                _options: { dialogOptions: "dontDisplay" }
              }
            ],
            { synchronousExecution: true }
          );
        }
      },
      { commandName: "Step Forward" }
    );

    return { ok: true, changed: true, data: { action: "step_forward", steps } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to step forward: ${error.message}` };
  }
};

commands["history.snapshot_create"] = async function (params) {
  const { name = "Snapshot", fullDocument = true } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [
                {
                  _ref: "snapshotClass"
                }
              ],
              from: {
                _ref: "historyState",
                _enum: "ordinal",
                _value: "currentHistoryState"
              },
              name: name,
              using: {
                _enum: "historyState",
                _value: fullDocument ? "fullDocument" : "mergedLayers"
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Create Snapshot" }
    );

    return { ok: true, changed: true, data: { action: "snapshot_create", name } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create snapshot: ${error.message}` };
  }
};

commands["history.goto_state"] = async function (params) {
  const { name, index } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  if (!name && !index) {
    return { ok: false, changed: false, error: "Either name or index must be provided" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        const target = name
          ? { _ref: "historyState", _name: name }
          : { _ref: "historyState", _index: index };

        await batchPlay(
          [
            {
              _obj: "select",
              _target: [target],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Go to History State" }
    );

    return { ok: true, changed: true, data: { action: "goto_state", name, index } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to go to history state: ${error.message}` };
  }
};

commands["history.clear"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "delete",
              _target: [
                {
                  _ref: "historyState",
                  _enum: "ordinal",
                  _value: "allExceptCurrent"
                }
              ],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Clear History" }
    );

    return { ok: true, changed: true, data: { action: "clear_history" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to clear history: ${error.message}` };
  }
};

commands["history.get_states"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    let historyInfo;

    await executeAsModal(
      async () => {
        // Get history state count
        const result = await batchPlay(
          [
            {
              _obj: "get",
              _target: [
                {
                  _property: "count"
                },
                {
                  _ref: "historyState"
                }
              ],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );

        const count = result[0]?.count || 0;
        const states = [];

        // Get current history state index
        const currentResult = await batchPlay(
          [
            {
              _obj: "get",
              _target: [
                {
                  _property: "currentHistoryState"
                },
                {
                  _ref: "document",
                  _enum: "ordinal",
                  _value: "targetEnum"
                }
              ],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );

        const currentIndex = currentResult[0]?.currentHistoryState?._index || 0;

        // Get state names (limit to last 20 for performance)
        const startIndex = Math.max(1, count - 19);
        for (let i = startIndex; i <= count; i++) {
          try {
            const stateResult = await batchPlay(
              [
                {
                  _obj: "get",
                  _target: [
                    {
                      _property: "name"
                    },
                    {
                      _ref: "historyState",
                      _index: i
                    }
                  ],
                  _options: { dialogOptions: "dontDisplay" }
                }
              ],
              { synchronousExecution: true }
            );
            states.push({
              index: i,
              name: stateResult[0]?.name || `State ${i}`,
              isCurrent: i === currentIndex
            });
          } catch (e) {
            // Skip states that can't be read
          }
        }

        historyInfo = {
          totalCount: count,
          currentIndex,
          states
        };
      },
      { commandName: "Get History States" }
    );

    return { ok: true, changed: false, data: historyInfo };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to get history states: ${error.message}` };
  }
};

// ============================================================================
// Filter Commands (batchPlay) - Blur, Sharpen, Noise, Stylize
// ============================================================================

commands["filter.gaussian_blur"] = async function (params) {
  const { radius } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "gaussianBlur",
              radius: { _unit: "pixelsUnit", _value: radius },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Gaussian Blur" }
    );

    return { ok: true, changed: true, data: { filter: "gaussianBlur", radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Gaussian Blur: ${error.message}` };
  }
};

commands["filter.motion_blur"] = async function (params) {
  const { angle, distance } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "motionBlur",
              angle: angle,
              distance: { _unit: "pixelsUnit", _value: distance },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Motion Blur" }
    );

    return { ok: true, changed: true, data: { filter: "motionBlur", angle, distance } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Motion Blur: ${error.message}` };
  }
};

commands["filter.radial_blur"] = async function (params) {
  const { amount, blurMethod, blurQuality } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const qualityMap = {
    draft: "draft",
    good: "good",
    best: "best"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "radialBlur",
              amount: amount,
              blurMethod: { _enum: "blurMethod", _value: blurMethod },
              blurQuality: { _enum: "blurQuality", _value: qualityMap[blurQuality] || "good" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Radial Blur" }
    );

    return { ok: true, changed: true, data: { filter: "radialBlur", amount, blurMethod, blurQuality } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Radial Blur: ${error.message}` };
  }
};

commands["filter.surface_blur"] = async function (params) {
  const { radius, threshold } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "surfaceBlur",
              radius: { _unit: "pixelsUnit", _value: radius },
              threshold: threshold,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Surface Blur" }
    );

    return { ok: true, changed: true, data: { filter: "surfaceBlur", radius, threshold } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Surface Blur: ${error.message}` };
  }
};

commands["filter.lens_blur"] = async function (params) {
  const { radius, bladeCurvature, rotation, brightness, threshold } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "lensBlur",
              source: { _enum: "depthMapSource", _value: "none" },
              focalDistance: 0,
              invertDepthMap: false,
              shape: { _enum: "bokehShape", _value: "hexagon" },
              bladeCount: 6,
              bladeCurvature: { _unit: "percentUnit", _value: bladeCurvature },
              rotation: { _unit: "angleUnit", _value: rotation },
              radius: radius,
              brightness: brightness,
              threshold: threshold,
              noiseAmount: 0,
              distribution: { _enum: "distribution", _value: "uniform" },
              monochromatic: false,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Lens Blur" }
    );

    return { ok: true, changed: true, data: { filter: "lensBlur", radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Lens Blur: ${error.message}` };
  }
};

commands["filter.unsharp_mask"] = async function (params) {
  const { amount, radius, threshold } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "unsharpMask",
              amount: { _unit: "percentUnit", _value: amount },
              radius: { _unit: "pixelsUnit", _value: radius },
              threshold: threshold,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Unsharp Mask" }
    );

    return { ok: true, changed: true, data: { filter: "unsharpMask", amount, radius, threshold } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Unsharp Mask: ${error.message}` };
  }
};

commands["filter.smart_sharpen"] = async function (params) {
  const { amount, radius, noiseReduction, removeBlur } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const blurTypeMap = {
    gaussianBlur: "gaussianBlur",
    lensBlur: "lensBlur",
    motionBlur: "motionBlur"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "smartSharpen",
              amount: { _unit: "percentUnit", _value: amount },
              radius: { _unit: "pixelsUnit", _value: radius },
              noiseReduction: { _unit: "percentUnit", _value: noiseReduction },
              blur: { _enum: "blurType", _value: blurTypeMap[removeBlur] || "gaussianBlur" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Smart Sharpen" }
    );

    return { ok: true, changed: true, data: { filter: "smartSharpen", amount, radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Smart Sharpen: ${error.message}` };
  }
};

commands["filter.add_noise"] = async function (params) {
  const { amount, distribution, monochromatic } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "addNoise",
              amount: { _unit: "percentUnit", _value: amount },
              distribution: { _enum: "distribution", _value: distribution },
              monochromatic: monochromatic,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Add Noise" }
    );

    return { ok: true, changed: true, data: { filter: "addNoise", amount, distribution, monochromatic } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to add noise: ${error.message}` };
  }
};

commands["filter.reduce_noise"] = async function (params) {
  const { strength, preserveDetails, reduceColorNoise, sharpenDetails } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "denoise",
              strength: strength,
              preserveDetails: { _unit: "percentUnit", _value: preserveDetails },
              reduceColorNoise: { _unit: "percentUnit", _value: reduceColorNoise },
              sharpenDetails: { _unit: "percentUnit", _value: sharpenDetails },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Reduce Noise" }
    );

    return { ok: true, changed: true, data: { filter: "reduceNoise", strength } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to reduce noise: ${error.message}` };
  }
};

commands["filter.liquify_push"] = async function (params) {
  const { startX, startY, endX, endY, brushSize, brushPressure } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        // Liquify uses a mesh-based approach, this is a simplified forward warp
        await batchPlay(
          [
            {
              _obj: "liquify",
              liquifyMesh: {
                _obj: "mesh",
                meshPoints: [
                  {
                    _obj: "meshPoint",
                    x: startX,
                    y: startY,
                    displaceX: endX - startX,
                    displaceY: endY - startY
                  }
                ]
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Liquify" }
    );

    return { ok: true, changed: true, data: { filter: "liquify", startX, startY, endX, endY } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Liquify: ${error.message}` };
  }
};

commands["filter.emboss"] = async function (params) {
  const { angle, height, amount } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "emboss",
              angle: angle,
              height: height,
              amount: { _unit: "percentUnit", _value: amount },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Emboss" }
    );

    return { ok: true, changed: true, data: { filter: "emboss", angle, height, amount } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Emboss: ${error.message}` };
  }
};

commands["filter.find_edges"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "findEdges",
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Find Edges" }
    );

    return { ok: true, changed: true, data: { filter: "findEdges" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to find edges: ${error.message}` };
  }
};

commands["filter.high_pass"] = async function (params) {
  const { radius } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "highPass",
              radius: { _unit: "pixelsUnit", _value: radius },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "High Pass" }
    );

    return { ok: true, changed: true, data: { filter: "highPass", radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply High Pass: ${error.message}` };
  }
};

commands["filter.dust_and_scratches"] = async function (params) {
  const { radius, threshold } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "dustAndScratches",
              radius: radius,
              threshold: threshold,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Dust & Scratches" }
    );

    return { ok: true, changed: true, data: { filter: "dustAndScratches", radius, threshold } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Dust & Scratches: ${error.message}` };
  }
};

commands["filter.median"] = async function (params) {
  const { radius } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "median",
              radius: { _unit: "pixelsUnit", _value: radius },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Median" }
    );

    return { ok: true, changed: true, data: { filter: "median", radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Median: ${error.message}` };
  }
};

commands["filter.maximum"] = async function (params) {
  const { radius } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "maximum",
              radius: { _unit: "pixelsUnit", _value: radius },
              preserveShape: { _enum: "preserveShape", _value: "squareness" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Maximum" }
    );

    return { ok: true, changed: true, data: { filter: "maximum", radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Maximum: ${error.message}` };
  }
};

commands["filter.minimum"] = async function (params) {
  const { radius } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "minimum",
              radius: { _unit: "pixelsUnit", _value: radius },
              preserveShape: { _enum: "preserveShape", _value: "squareness" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Minimum" }
    );

    return { ok: true, changed: true, data: { filter: "minimum", radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to apply Minimum: ${error.message}` };
  }
};

// ============================================================================
// Transform Commands (batchPlay) - Scale, Rotate, Flip, Move
// ============================================================================

// Helper to convert anchor string to Photoshop anchor position
function getAnchorPosition(anchor) {
  const anchorMap = {
    topLeft: { horizontal: "left", vertical: "top" },
    topCenter: { horizontal: "center", vertical: "top" },
    topRight: { horizontal: "right", vertical: "top" },
    middleLeft: { horizontal: "left", vertical: "center" },
    middleCenter: { horizontal: "center", vertical: "center" },
    middleRight: { horizontal: "right", vertical: "center" },
    bottomLeft: { horizontal: "left", vertical: "bottom" },
    bottomCenter: { horizontal: "center", vertical: "bottom" },
    bottomRight: { horizontal: "right", vertical: "bottom" },
  };
  return anchorMap[anchor] || anchorMap.middleCenter;
}

commands["transform.scale"] = async function (params) {
  const { scaleX, scaleY, anchor } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "transform",
              freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
              width: { _unit: "percentUnit", _value: scaleX },
              height: { _unit: "percentUnit", _value: scaleY },
              interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Scale Layer" }
    );

    return { ok: true, changed: true, data: { transform: "scale", scaleX, scaleY } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to scale: ${error.message}` };
  }
};

commands["transform.rotate"] = async function (params) {
  const { angle, anchor } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "transform",
              freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
              angle: { _unit: "angleUnit", _value: angle },
              interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Rotate Layer" }
    );

    return { ok: true, changed: true, data: { transform: "rotate", angle } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to rotate: ${error.message}` };
  }
};

commands["transform.flip_horizontal"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "flip",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              axis: { _enum: "orientation", _value: "horizontal" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Flip Horizontal" }
    );

    return { ok: true, changed: true, data: { transform: "flipHorizontal" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to flip horizontal: ${error.message}` };
  }
};

commands["transform.flip_vertical"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "flip",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              axis: { _enum: "orientation", _value: "vertical" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Flip Vertical" }
    );

    return { ok: true, changed: true, data: { transform: "flipVertical" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to flip vertical: ${error.message}` };
  }
};

commands["transform.skew"] = async function (params) {
  const { skewX, skewY } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "transform",
              freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
              skew: {
                _obj: "paint",
                horizontal: { _unit: "angleUnit", _value: skewX },
                vertical: { _unit: "angleUnit", _value: skewY }
              },
              interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Skew Layer" }
    );

    return { ok: true, changed: true, data: { transform: "skew", skewX, skewY } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to skew: ${error.message}` };
  }
};

commands["transform.move"] = async function (params) {
  const { deltaX, deltaY } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "move",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              to: {
                _obj: "offset",
                horizontal: { _unit: "pixelsUnit", _value: deltaX },
                vertical: { _unit: "pixelsUnit", _value: deltaY }
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Move Layer" }
    );

    return { ok: true, changed: true, data: { transform: "move", deltaX, deltaY } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to move: ${error.message}` };
  }
};

commands["transform.free_transform"] = async function (params) {
  const { scaleX, scaleY, angle, moveX, moveY, skewX, skewY, anchor } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        const descriptor = {
          _obj: "transform",
          freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
          interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
          _options: { dialogOptions: "dontDisplay" }
        };

        if (scaleX !== 100 || scaleY !== 100) {
          descriptor.width = { _unit: "percentUnit", _value: scaleX };
          descriptor.height = { _unit: "percentUnit", _value: scaleY };
        }

        if (angle !== 0) {
          descriptor.angle = { _unit: "angleUnit", _value: angle };
        }

        if (moveX !== 0 || moveY !== 0) {
          descriptor.offset = {
            _obj: "offset",
            horizontal: { _unit: "pixelsUnit", _value: moveX },
            vertical: { _unit: "pixelsUnit", _value: moveY }
          };
        }

        if (skewX !== 0 || skewY !== 0) {
          descriptor.skew = {
            _obj: "paint",
            horizontal: { _unit: "angleUnit", _value: skewX },
            vertical: { _unit: "angleUnit", _value: skewY }
          };
        }

        await batchPlay([descriptor], { synchronousExecution: true });
      },
      { commandName: "Free Transform" }
    );

    return { ok: true, changed: true, data: { transform: "freeTransform" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to free transform: ${error.message}` };
  }
};

commands["transform.rotate_90_cw"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "transform",
              freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
              angle: { _unit: "angleUnit", _value: 90 },
              interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Rotate 90 CW" }
    );

    return { ok: true, changed: true, data: { transform: "rotate90cw" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to rotate 90 CW: ${error.message}` };
  }
};

commands["transform.rotate_90_ccw"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "transform",
              freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
              angle: { _unit: "angleUnit", _value: -90 },
              interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Rotate 90 CCW" }
    );

    return { ok: true, changed: true, data: { transform: "rotate90ccw" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to rotate 90 CCW: ${error.message}` };
  }
};

commands["transform.rotate_180"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "transform",
              freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
              angle: { _unit: "angleUnit", _value: 180 },
              interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Rotate 180" }
    );

    return { ok: true, changed: true, data: { transform: "rotate180" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to rotate 180: ${error.message}` };
  }
};

commands["canvas.resize"] = async function (params) {
  const { width, height, anchor } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const anchorPos = getAnchorPosition(anchor);

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "canvasSize",
              width: { _unit: "pixelsUnit", _value: width },
              height: { _unit: "pixelsUnit", _value: height },
              horizontal: { _enum: "horizontalLocation", _value: anchorPos.horizontal },
              vertical: { _enum: "verticalLocation", _value: anchorPos.vertical },
              canvasExtensionColorType: { _enum: "canvasExtensionColorType", _value: "backgroundColor" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Canvas Size" }
    );

    return { ok: true, changed: true, data: { canvas: "resize", width, height } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to resize canvas: ${error.message}` };
  }
};

commands["image.resize"] = async function (params) {
  const { width, height, resampleMethod, constrainProportions } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const resampleMap = {
    nearestNeighbor: "nearestNeighbor",
    bilinear: "bilinear",
    bicubic: "bicubic",
    bicubicSmoother: "bicubicSmoother",
    bicubicSharper: "bicubicSharper",
    bicubicAutomatic: "bicubicAutomatic",
    automaticInterpolation: "automaticInterpolation"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        const descriptor = {
          _obj: "imageSize",
          constrainProportions: constrainProportions,
          interfaceIconFrameDimmed: { _enum: "interpolationType", _value: resampleMap[resampleMethod] || "bicubicAutomatic" },
          _options: { dialogOptions: "dontDisplay" }
        };

        if (width) {
          descriptor.width = { _unit: "pixelsUnit", _value: width };
        }
        if (height) {
          descriptor.height = { _unit: "pixelsUnit", _value: height };
        }

        await batchPlay([descriptor], { synchronousExecution: true });
      },
      { commandName: "Image Size" }
    );

    return { ok: true, changed: true, data: { image: "resize", width, height } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to resize image: ${error.message}` };
  }
};

commands["image.crop"] = async function (params) {
  const { top, left, bottom, right } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "crop",
              to: {
                _obj: "rectangle",
                top: { _unit: "pixelsUnit", _value: top },
                left: { _unit: "pixelsUnit", _value: left },
                bottom: { _unit: "pixelsUnit", _value: bottom },
                right: { _unit: "pixelsUnit", _value: right }
              },
              angle: { _unit: "angleUnit", _value: 0 },
              delete: true,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Crop" }
    );

    return { ok: true, changed: true, data: { image: "crop", top, left, bottom, right } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to crop: ${error.message}` };
  }
};

commands["image.trim"] = async function (params) {
  const { trimType, trimTop, trimLeft, trimBottom, trimRight } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const trimTypeMap = {
    transparent: "transparency",
    topLeftPixelColor: "topLeftPixelColor",
    bottomRightPixelColor: "bottomRightPixelColor"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "trim",
              trimBasedOn: { _enum: "trimBasedOn", _value: trimTypeMap[trimType] || "transparency" },
              top: trimTop,
              left: trimLeft,
              bottom: trimBottom,
              right: trimRight,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Trim" }
    );

    return { ok: true, changed: true, data: { image: "trim", trimType } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to trim: ${error.message}` };
  }
};

// ============================================================================
// Text/Type Commands (batchPlay)
// ============================================================================

commands["text.create"] = async function (params) {
  const { text, fontName, fontSize, color, positionX, positionY, justification } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const justificationMap = {
    left: "left",
    center: "center",
    right: "right"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    let layerId;

    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              _target: [{ _ref: "textLayer" }],
              using: {
                _obj: "textLayer",
                textKey: text,
                textClickPoint: {
                  _obj: "paint",
                  horizontal: { _unit: "pixelsUnit", _value: positionX },
                  vertical: { _unit: "pixelsUnit", _value: positionY }
                },
                textStyleRange: [
                  {
                    _obj: "textStyleRange",
                    from: 0,
                    to: text.length,
                    textStyle: {
                      _obj: "textStyle",
                      fontPostScriptName: fontName,
                      size: { _unit: "pointsUnit", _value: fontSize },
                      color: {
                        _obj: "RGBColor",
                        red: color.red,
                        grain: color.green,
                        blue: color.blue
                      }
                    }
                  }
                ],
                paragraphStyleRange: [
                  {
                    _obj: "paragraphStyleRange",
                    from: 0,
                    to: text.length,
                    paragraphStyle: {
                      _obj: "paragraphStyle",
                      align: { _enum: "alignmentType", _value: justificationMap[justification] || "left" }
                    }
                  }
                ]
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        layerId = app.activeDocument.activeLayers[0]?.id;
      },
      { commandName: "Create Text Layer" }
    );

    return { ok: true, changed: true, data: { layerId, text, fontName, fontSize } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create text layer: ${error.message}` };
  }
};

commands["text.edit_content"] = async function (params) {
  const { layerId, text } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        const target = layerId
          ? [{ _ref: "layer", _id: layerId }]
          : [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }];

        await batchPlay(
          [
            {
              _obj: "set",
              _target: target,
              to: {
                _obj: "textLayer",
                textKey: text
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Edit Text Content" }
    );

    return { ok: true, changed: true, data: { text } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to edit text: ${error.message}` };
  }
};

commands["text.set_style"] = async function (params) {
  const { layerId, fontName, fontSize, color, bold, italic, underline, strikethrough, tracking, leading } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        const target = layerId
          ? [{ _ref: "layer", _id: layerId }]
          : [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }];

        const textStyle = { _obj: "textStyle" };

        if (fontName) textStyle.fontPostScriptName = fontName;
        if (fontSize) textStyle.size = { _unit: "pointsUnit", _value: fontSize };
        if (color) {
          textStyle.color = {
            _obj: "RGBColor",
            red: color.red,
            grain: color.green,
            blue: color.blue
          };
        }
        if (bold !== undefined) textStyle.syntheticBold = bold;
        if (italic !== undefined) textStyle.syntheticItalic = italic;
        if (underline !== undefined) textStyle.underline = underline ? { _enum: "underline", _value: "underlineOnLeftInVertical" } : { _enum: "underline", _value: "underlineOff" };
        if (strikethrough !== undefined) textStyle.strikethrough = strikethrough ? { _enum: "strikethrough", _value: "xHeightStrikethroughOn" } : { _enum: "strikethrough", _value: "strikethroughOff" };
        if (tracking !== undefined) textStyle.tracking = tracking;
        if (leading !== undefined) textStyle.leading = { _unit: "pointsUnit", _value: leading };

        await batchPlay(
          [
            {
              _obj: "set",
              _target: target,
              to: {
                _obj: "textLayer",
                textStyleRange: [
                  {
                    _obj: "textStyleRange",
                    from: 0,
                    to: 9999,
                    textStyle: textStyle
                  }
                ]
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Set Text Style" }
    );

    return { ok: true, changed: true, data: { fontName, fontSize } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to set text style: ${error.message}` };
  }
};

commands["text.set_paragraph"] = async function (params) {
  const { layerId, justification, firstLineIndent, startIndent, endIndent, spaceBefore, spaceAfter } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const justificationMap = {
    left: "left",
    center: "center",
    right: "right",
    justifyLeft: "justifyLeft",
    justifyCenter: "justifyCenter",
    justifyRight: "justifyRight",
    justifyAll: "justifyAll"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        const target = layerId
          ? [{ _ref: "layer", _id: layerId }]
          : [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }];

        const paragraphStyle = { _obj: "paragraphStyle" };

        if (justification) paragraphStyle.align = { _enum: "alignmentType", _value: justificationMap[justification] };
        if (firstLineIndent !== undefined) paragraphStyle.firstLineIndent = { _unit: "pointsUnit", _value: firstLineIndent };
        if (startIndent !== undefined) paragraphStyle.startIndent = { _unit: "pointsUnit", _value: startIndent };
        if (endIndent !== undefined) paragraphStyle.endIndent = { _unit: "pointsUnit", _value: endIndent };
        if (spaceBefore !== undefined) paragraphStyle.spaceBefore = { _unit: "pointsUnit", _value: spaceBefore };
        if (spaceAfter !== undefined) paragraphStyle.spaceAfter = { _unit: "pointsUnit", _value: spaceAfter };

        await batchPlay(
          [
            {
              _obj: "set",
              _target: target,
              to: {
                _obj: "textLayer",
                paragraphStyleRange: [
                  {
                    _obj: "paragraphStyleRange",
                    from: 0,
                    to: 9999,
                    paragraphStyle: paragraphStyle
                  }
                ]
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Set Paragraph Style" }
    );

    return { ok: true, changed: true, data: { justification } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to set paragraph style: ${error.message}` };
  }
};

commands["text.get_fonts"] = async function (params) {
  const { filter, limit } = params;

  try {
    const fonts = require("photoshop").app.fonts;
    let fontList = [];

    for (const font of fonts) {
      if (fontList.length >= limit) break;

      const fontInfo = {
        family: font.family,
        postScriptName: font.postScriptName,
        style: font.style
      };

      if (filter) {
        const lowerFilter = filter.toLowerCase();
        if (
          fontInfo.family.toLowerCase().includes(lowerFilter) ||
          fontInfo.postScriptName.toLowerCase().includes(lowerFilter)
        ) {
          fontList.push(fontInfo);
        }
      } else {
        fontList.push(fontInfo);
      }
    }

    return { ok: true, changed: false, data: { fonts: fontList, count: fontList.length } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to get fonts: ${error.message}` };
  }
};

commands["text.warp"] = async function (params) {
  const { layerId, style, bend, horizontalDistortion, verticalDistortion } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const styleMap = {
    arc: "warpArc",
    arcLower: "warpArcLower",
    arcUpper: "warpArcUpper",
    arch: "warpArch",
    bulge: "warpBulge",
    shellLower: "warpShellLower",
    shellUpper: "warpShellUpper",
    flag: "warpFlag",
    wave: "warpWave",
    fish: "warpFish",
    rise: "warpRise",
    fisheye: "warpFisheye",
    inflate: "warpInflate",
    squeeze: "warpSqueeze",
    twist: "warpTwist"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        const target = layerId
          ? [{ _ref: "layer", _id: layerId }]
          : [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }];

        await batchPlay(
          [
            {
              _obj: "set",
              _target: target,
              to: {
                _obj: "textLayer",
                textShape: [
                  {
                    _obj: "textShape",
                    char: { _enum: "char", _value: "paintChasePaint" },
                    orientation: { _enum: "orientation", _value: "horizontal" },
                    warp: {
                      _obj: "warp",
                      warpStyle: { _enum: "warpStyle", _value: styleMap[style] || "warpNone" },
                      warpValue: bend,
                      warpPerspective: 0,
                      warpPerspectiveOther: 0,
                      warpRotate: { _enum: "orientation", _value: "horizontal" }
                    }
                  }
                ]
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Warp Text" }
    );

    return { ok: true, changed: true, data: { style, bend } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to warp text: ${error.message}` };
  }
};

commands["text.convert_to_shape"] = async function (params) {
  const { layerId } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        // Select the layer first if specified
        if (layerId) {
          await batchPlay(
            [
              {
                _obj: "select",
                _target: [{ _ref: "layer", _id: layerId }],
                makeVisible: false,
                _options: { dialogOptions: "dontDisplay" }
              }
            ],
            { synchronousExecution: true }
          );
        }

        await batchPlay(
          [
            {
              _obj: "convertToShape",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Convert Text to Shape" }
    );

    return { ok: true, changed: true, data: { action: "convertToShape" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to convert to shape: ${error.message}` };
  }
};

commands["text.rasterize"] = async function (params) {
  const { layerId } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        // Select the layer first if specified
        if (layerId) {
          await batchPlay(
            [
              {
                _obj: "select",
                _target: [{ _ref: "layer", _id: layerId }],
                makeVisible: false,
                _options: { dialogOptions: "dontDisplay" }
              }
            ],
            { synchronousExecution: true }
          );
        }

        await batchPlay(
          [
            {
              _obj: "rasterizeLayer",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Rasterize Text" }
    );

    return { ok: true, changed: true, data: { action: "rasterize" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to rasterize: ${error.message}` };
  }
};

// ============================================================================
// Mask Commands (batchPlay)
// ============================================================================

commands["mask.add_layer_mask"] = async function (params) {
  const { maskType } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const maskTypeMap = {
    revealAll: "revealAll",
    hideAll: "hideAll",
    revealSelection: "revealSelection",
    hideSelection: "hideSelection"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "make",
              new: { _class: "channel" },
              at: { _ref: "channel", _enum: "channel", _value: "mask" },
              using: { _enum: "userMaskEnabled", _value: maskTypeMap[maskType] || "revealAll" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Add Layer Mask" }
    );

    return { ok: true, changed: true, data: { action: "addLayerMask", maskType } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to add layer mask: ${error.message}` };
  }
};

commands["mask.delete"] = async function (params) {
  const { apply } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "delete",
              _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
              apply: apply,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Delete Layer Mask" }
    );

    return { ok: true, changed: true, data: { action: "deleteMask", applied: apply } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to delete mask: ${error.message}` };
  }
};

commands["mask.enable_disable"] = async function (params) {
  const { enabled } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "set",
              _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
              to: { _obj: "layer", userMaskEnabled: enabled },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: enabled ? "Enable Mask" : "Disable Mask" }
    );

    return { ok: true, changed: true, data: { action: "toggleMask", enabled } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to toggle mask: ${error.message}` };
  }
};

commands["mask.invert"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        // Select the mask channel first
        await batchPlay(
          [
            {
              _obj: "select",
              _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );

        // Invert
        await batchPlay(
          [
            {
              _obj: "invert",
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );

        // Select RGB composite to deselect mask
        await batchPlay(
          [
            {
              _obj: "select",
              _target: [{ _ref: "channel", _enum: "channel", _value: "RGB" }],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Invert Mask" }
    );

    return { ok: true, changed: true, data: { action: "invertMask" } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to invert mask: ${error.message}` };
  }
};

commands["mask.load_selection"] = async function (params) {
  const { operation } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  const operationMap = {
    replace: "setd",
    add: "addTo",
    subtract: "subtractFrom",
    intersect: "interfaceIconFrameDimmed"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: operationMap[operation] || "setd",
              _target: [{ _ref: "channel", _property: "selection" }],
              to: { _ref: "channel", _enum: "channel", _value: "mask" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Load Mask as Selection" }
    );

    return { ok: true, changed: true, data: { action: "loadMaskSelection", operation } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to load mask as selection: ${error.message}` };
  }
};

commands["mask.feather"] = async function (params) {
  const { radius } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        // Select the mask
        await batchPlay(
          [
            {
              _obj: "select",
              _target: [{ _ref: "channel", _enum: "channel", _value: "mask" }],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );

        // Apply Gaussian Blur to feather
        await batchPlay(
          [
            {
              _obj: "gaussianBlur",
              radius: { _unit: "pixelsUnit", _value: radius },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );

        // Deselect mask
        await batchPlay(
          [
            {
              _obj: "select",
              _target: [{ _ref: "channel", _enum: "channel", _value: "RGB" }],
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Feather Mask" }
    );

    return { ok: true, changed: true, data: { action: "featherMask", radius } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to feather mask: ${error.message}` };
  }
};

// ============================================================================
// Document/Info Commands
// ============================================================================

commands["doc.get_info"] = async function (_params) {
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  return {
    ok: true,
    changed: false,
    data: {
      id: doc.id,
      name: doc.name,
      path: doc.path || null,
      width: doc.width,
      height: doc.height,
      resolution: doc.resolution,
      mode: doc.mode,
      colorProfileName: doc.colorProfileName,
      bitsPerChannel: doc.bitsPerChannel,
      layerCount: doc.layers.length,
      activeLayerId: doc.activeLayers[0]?.id,
      activeLayerName: doc.activeLayers[0]?.name,
      hasSelection: doc.selection?.bounds !== null
    }
  };
};

commands["layer.get_bounds"] = async function (params) {
  const { layerId } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    let layer;
    if (layerId) {
      layer = doc.layers.find(l => l.id === layerId);
      if (!layer) {
        return { ok: false, changed: false, error: `Layer with ID ${layerId} not found` };
      }
    } else {
      layer = doc.activeLayers[0];
      if (!layer) {
        return { ok: false, changed: false, error: "No active layer" };
      }
    }

    const bounds = layer.bounds;
    return {
      ok: true,
      changed: false,
      data: {
        layerId: layer.id,
        layerName: layer.name,
        bounds: {
          left: bounds.left,
          top: bounds.top,
          right: bounds.right,
          bottom: bounds.bottom,
          width: bounds.right - bounds.left,
          height: bounds.bottom - bounds.top
        }
      }
    };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to get layer bounds: ${error.message}` };
  }
};

commands["doc.new"] = async function (params) {
  const { width, height, resolution, name, colorMode, fillColor } = params;

  const colorModeMap = {
    rgb: "RGBColorMode",
    cmyk: "CMYKColorMode",
    grayscale: "grayscaleMode",
    lab: "labColorMode",
    bitmap: "bitmapMode"
  };

  const fillMap = {
    white: "white",
    backgroundColor: "backgroundColor",
    transparent: "transparent"
  };

  try {
    const { batchPlay } = require("photoshop").action;
    let newDocId;

    await executeAsModal(
      async () => {
        const result = await batchPlay(
          [
            {
              _obj: "make",
              new: {
                _obj: "document",
                name: name,
                mode: { _class: colorModeMap[colorMode] || "RGBColorMode" },
                width: { _unit: "pixelsUnit", _value: width },
                height: { _unit: "pixelsUnit", _value: height },
                resolution: { _unit: "densityUnit", _value: resolution },
                fill: { _enum: "fill", _value: fillMap[fillColor] || "white" },
                depth: 8
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
        newDocId = app.activeDocument?.id;
      },
      { commandName: "New Document" }
    );

    return { ok: true, changed: true, data: { documentId: newDocId, name, width, height } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to create document: ${error.message}` };
  }
};

commands["doc.save"] = async function (params) {
  const { filePath, format } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    await executeAsModal(
      async () => {
        if (filePath) {
          const fs = require("uxp").storage.localFileSystem;
          const file = await fs.getFileForSaving(filePath);
          await doc.saveAs.psd(file);
        } else {
          await doc.save();
        }
      },
      { commandName: "Save Document" }
    );

    return { ok: true, changed: false, data: { action: "save", path: filePath || doc.path } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to save: ${error.message}` };
  }
};

commands["doc.open"] = async function (params) {
  const { path } = params;
  if (!path) {
    return { ok: false, changed: false, error: "path is required" };
  }

  try {
    const fs = require("uxp").storage.localFileSystem;
    let openedDoc = null;

    await executeAsModal(
      async () => {
        const file = await fs.getEntryWithUrl("file:" + path);
        openedDoc = await app.open(file);
      },
      { commandName: "Open Document" }
    );

    return {
      ok: true,
      changed: true,
      data: {
        documentId: openedDoc?.id,
        name: openedDoc?.name,
        path: path
      }
    };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to open document: ${error.message}` };
  }
};

commands["doc.save_as"] = async function (params) {
  const { path, format } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }
  if (!path) {
    return { ok: false, changed: false, error: "path is required" };
  }

  try {
    const fs = require("uxp").storage.localFileSystem;

    await executeAsModal(
      async () => {
        const file = await fs.getFileForSaving(path);
        const ext = format || path.split('.').pop()?.toLowerCase();

        switch (ext) {
          case 'psd':
            await doc.saveAs.psd(file);
            break;
          case 'png':
            await doc.saveAs.png(file);
            break;
          case 'jpg':
          case 'jpeg':
            await doc.saveAs.jpg(file, { quality: 12 });
            break;
          case 'tiff':
          case 'tif':
            await doc.saveAs.tiff(file);
            break;
          default:
            await doc.saveAs.psd(file);
        }
      },
      { commandName: "Save As" }
    );

    return { ok: true, changed: false, data: { action: "saveAs", path: path, format: format } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to save as: ${error.message}` };
  }
};

commands["export.png"] = async function (params) {
  const { filePath, quality } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "save",
              as: {
                _obj: "PNGFormat",
                method: { _enum: "PNGMethod", _value: "moderate" },
                PNGInterlaceType: { _enum: "PNGInterlaceType", _value: "PNGInterlaceNone" }
              },
              in: { _path: filePath, _kind: "local" },
              copy: true,
              lowerCase: true,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Export PNG" }
    );

    return { ok: true, changed: false, data: { action: "exportPng", path: filePath } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to export PNG: ${error.message}` };
  }
};

commands["export.jpeg"] = async function (params) {
  const { filePath, quality } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "save",
              as: {
                _obj: "JPEG",
                extendedQuality: quality,
                matteColor: { _enum: "matteColor", _value: "none" }
              },
              in: { _path: filePath, _kind: "local" },
              copy: true,
              lowerCase: true,
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Export JPEG" }
    );

    return { ok: true, changed: false, data: { action: "exportJpeg", path: filePath, quality } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to export JPEG: ${error.message}` };
  }
};

// ============================================================================
// Fill Commands
// ============================================================================

commands["fill.foreground"] = async function (params) {
  const { opacity, blendMode } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "fill",
              using: { _enum: "fillContents", _value: "foregroundColor" },
              opacity: { _unit: "percentUnit", _value: opacity },
              mode: { _enum: "blendMode", _value: blendMode },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Fill Foreground" }
    );

    return { ok: true, changed: true, data: { fill: "foreground", opacity } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to fill: ${error.message}` };
  }
};

commands["fill.background"] = async function (params) {
  const { opacity, blendMode } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "fill",
              using: { _enum: "fillContents", _value: "backgroundColor" },
              opacity: { _unit: "percentUnit", _value: opacity },
              mode: { _enum: "blendMode", _value: blendMode },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Fill Background" }
    );

    return { ok: true, changed: true, data: { fill: "background", opacity } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to fill: ${error.message}` };
  }
};

commands["fill.color"] = async function (params) {
  const { red, green, blue, opacity } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "fill",
              using: { _enum: "fillContents", _value: "color" },
              color: {
                _obj: "RGBColor",
                red: red,
                grain: green,
                blue: blue
              },
              opacity: { _unit: "percentUnit", _value: opacity },
              mode: { _enum: "blendMode", _value: "normal" },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Fill Color" }
    );

    return { ok: true, changed: true, data: { fill: "color", red, green, blue } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to fill: ${error.message}` };
  }
};

commands["color.set_foreground"] = async function (params) {
  const { red, green, blue } = params;

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "set",
              _target: [{ _ref: "color", _property: "foregroundColor" }],
              to: {
                _obj: "RGBColor",
                red: red,
                grain: green,
                blue: blue
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Set Foreground Color" }
    );

    return { ok: true, changed: true, data: { color: "foreground", red, green, blue } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to set foreground color: ${error.message}` };
  }
};

commands["color.set_background"] = async function (params) {
  const { red, green, blue } = params;

  try {
    const { batchPlay } = require("photoshop").action;
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: "set",
              _target: [{ _ref: "color", _property: "backgroundColor" }],
              to: {
                _obj: "RGBColor",
                red: red,
                grain: green,
                blue: blue
              },
              _options: { dialogOptions: "dontDisplay" }
            }
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: "Set Background Color" }
    );

    return { ok: true, changed: true, data: { color: "background", red, green, blue } };
  } catch (error) {
    return { ok: false, changed: false, error: `Failed to set background color: ${error.message}` };
  }
};

// ============================================================================
// Raw BatchPlay - The "Escape Hatch"
// ============================================================================

commands["raw.batchplay"] = async function (params) {
  const { descriptor, historyName } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    let result;

    await executeAsModal(
      async () => {
        // Ensure descriptor has dialogOptions
        const desc = { ...descriptor };
        if (!desc._options) {
          desc._options = { dialogOptions: "dontDisplay" };
        }

        result = await batchPlay([desc], { synchronousExecution: true });
      },
      { commandName: historyName }
    );

    return { ok: true, changed: true, data: { result } };
  } catch (error) {
    return { ok: false, changed: false, error: `BatchPlay failed: ${error.message}` };
  }
};

commands["raw.batchplay_multiple"] = async function (params) {
  const { descriptors, historyName } = params;
  const doc = app.activeDocument;
  if (!doc) {
    return { ok: false, changed: false, error: "No active document" };
  }

  if (!Array.isArray(descriptors) || descriptors.length === 0) {
    return { ok: false, changed: false, error: "Descriptors must be a non-empty array" };
  }

  try {
    const { batchPlay } = require("photoshop").action;
    let results;

    await executeAsModal(
      async () => {
        // Ensure each descriptor has dialogOptions
        const descs = descriptors.map(d => {
          const desc = { ...d };
          if (!desc._options) {
            desc._options = { dialogOptions: "dontDisplay" };
          }
          return desc;
        });

        results = await batchPlay(descs, { synchronousExecution: true });
      },
      { commandName: historyName }
    );

    return { ok: true, changed: true, data: { results, count: descriptors.length } };
  } catch (error) {
    return { ok: false, changed: false, error: `BatchPlay multiple failed: ${error.message}` };
  }
};

// WebSocket connection state
let ws = null;
let autoReconnect = true;
let reconnectInterval = null;
const RECONNECT_DELAY = 3000; // 3 seconds

// UI elements
let statusIndicator,
  statusText,
  connectBtn,
  disconnectBtn,
  testBtn,
  serverUrlInput,
  logContainer;

/**
 * Add a log entry to the UI
 */
function log(message, type = "info") {
  console.log(`[MCP Bridge] ${message}`);
  if (!logContainer) return;

  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logContainer.insertBefore(entry, logContainer.firstChild);

  while (logContainer.children.length > 50) {
    logContainer.removeChild(logContainer.lastChild);
  }
}

/**
 * Update UI connection status
 */
function updateStatus(status) {
  if (!statusIndicator || !statusText || !connectBtn || !disconnectBtn) return;

  statusIndicator.className = `status-indicator ${status}`;

  switch (status) {
    case "connected":
      statusText.textContent = "Connected";
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      if (testBtn) testBtn.disabled = false;
      break;
    case "connecting":
      statusText.textContent = "Connecting...";
      connectBtn.disabled = true;
      disconnectBtn.disabled = true;
      if (testBtn) testBtn.disabled = true;
      break;
    case "disconnected":
    default:
      statusText.textContent = "Disconnected";
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
      if (testBtn) testBtn.disabled = true;
      break;
  }
}

/**
 * Handle incoming WebSocket message
 */
async function handleMessage(event) {
  let request;
  try {
    request = JSON.parse(event.data);
  } catch (e) {
    log(`Invalid JSON received: ${e.message}`, "error");
    return;
  }

  const { id, command, params } = request;
  log(`Received: ${command}`);

  const handler = commands[command];
  if (!handler) {
    sendResponse(id, {
      ok: false,
      changed: false,
      error: `Unknown command: ${command}`,
    });
    return;
  }

  try {
    const result = await handler(params || {});
    sendResponse(id, result);
    log(`Completed: ${command}`, "success");
  } catch (error) {
    log(`Error in ${command}: ${error.message}`, "error");
    sendResponse(id, {
      ok: false,
      changed: false,
      error: error.message,
    });
  }
}

/**
 * Send response back via WebSocket
 */
function sendResponse(id, response) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    log("Cannot send response: WebSocket not connected", "error");
    return;
  }

  const payload = JSON.stringify({ id, ...response });
  ws.send(payload);
}

/**
 * Connect to WebSocket server
 */
function connect() {
  const url = serverUrlInput?.value || "ws://localhost:8765";

  // Re-enable auto-reconnect on manual connect
  autoReconnect = true;

  if (ws) {
    ws.close();
  }

  updateStatus("connecting");
  log(`Connecting to ${url}...`);

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      updateStatus("connected");
      log("Connected to MCP server", "success");
      log(`WebSocket readyState: ${ws.readyState}`, "info");

      // Clear reconnect interval on successful connection
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
    };

    ws.onmessage = (event) => {
      log(`Raw message received: ${event.data.substring(0, 100)}...`, "info");
      handleMessage(event);
    };

    ws.onclose = (event) => {
      updateStatus("disconnected");
      log(
        `Disconnected: code=${event.code}, reason=${event.reason || "none"}, wasClean=${event.wasClean}`,
        "info",
      );
      ws = null;

      // Auto-reconnect if enabled
      if (autoReconnect && !reconnectInterval) {
        log(
          `Auto-reconnect enabled, retrying in ${RECONNECT_DELAY / 1000}s...`,
          "info",
        );
        reconnectInterval = setInterval(() => {
          if (!ws || ws.readyState === WebSocket.CLOSED) {
            log("Attempting auto-reconnect...", "info");
            connect();
          }
          if (ws && ws.readyState === WebSocket.OPEN) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
          }
        }, RECONNECT_DELAY);
      }
    };

    ws.onerror = (error) => {
      console.error("[MCP Bridge] WebSocket error object:", error);
      log(
        `WebSocket error: ${error.message || error.type || "Unknown error"}`,
        "error",
      );
      // Log additional error details if available
      if (error.error) {
        log(`Error details: ${error.error}`, "error");
      }
    };
  } catch (error) {
    updateStatus("disconnected");
    log(`Failed to connect: ${error.message}`, "error");
    console.error("[MCP Bridge] Connection exception:", error);
  }
}

/**
 * Disconnect from WebSocket server
 */
function disconnect() {
  // Disable auto-reconnect on manual disconnect
  autoReconnect = false;
  if (reconnectInterval) {
    clearInterval(reconnectInterval);
    reconnectInterval = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }
  updateStatus("disconnected");
  log("Disconnected manually (auto-reconnect disabled)");
}

/**
 * Test app.get_info locally (no server needed)
 */
async function testGetInfo() {
  log("Testing app.get_info locally...");
  try {
    const result = await commands["app.get_info"]({});
    log(`Result: ${JSON.stringify(result.data)}`, "success");
  } catch (e) {
    log(`Error: ${e.message}`, "error");
  }
}

/**
 * Initialize the panel UI
 */
function initPanel() {
  console.log("[MCP Bridge] Initializing panel...");

  statusIndicator = document.getElementById("statusIndicator");
  statusText = document.getElementById("statusText");
  connectBtn = document.getElementById("connectBtn");
  disconnectBtn = document.getElementById("disconnectBtn");
  testBtn = document.getElementById("testBtn");
  serverUrlInput = document.getElementById("serverUrl");
  logContainer = document.getElementById("logContainer");

  if (connectBtn) {
    connectBtn.addEventListener("click", connect);
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener("click", disconnect);
  }

  if (testBtn) {
    testBtn.addEventListener("click", testGetInfo);
    testBtn.disabled = false; // Enable test button even when disconnected
  }

  updateStatus("disconnected");
  log("MCP Bridge initialized");
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPanel);
} else {
  initPanel();
}

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

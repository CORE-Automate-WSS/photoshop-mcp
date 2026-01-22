/**
 * Photoshop MCP Bridge - UXP Plugin Main Entry
 *
 * This plugin runs inside Photoshop and acts as a bridge between
 * the external MCP server and Photoshop's internal APIs.
 */

const photoshop = require('photoshop');
const { app, core } = photoshop;
const { executeAsModal } = core;

// Command handlers
const commands = {
  'app.get_info': require('./commands/app.js').getInfo,
  'doc.get_active': require('./commands/document.js').getActive,
  'doc.open': require('./commands/document.js').open,
  'doc.save': require('./commands/document.js').save,
  'doc.save_as': require('./commands/document.js').saveAs,
  'layer.list': require('./commands/layer.js').list,
  'layer.select': require('./commands/layer.js').select,
  'layer.rename': require('./commands/layer.js').rename,
  'layer.set_visibility': require('./commands/layer.js').setVisibility,
  'layer.set_opacity': require('./commands/layer.js').setOpacity,
};

// WebSocket connection state
let ws = null;
let reconnectTimeout = null;

// UI elements
let statusIndicator, statusText, connectBtn, disconnectBtn, serverUrlInput, logContainer;

/**
 * Add a log entry to the UI
 */
function log(message, type = 'info') {
  if (!logContainer) return;

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logContainer.insertBefore(entry, logContainer.firstChild);

  // Keep only last 50 entries
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
    case 'connected':
      statusText.textContent = 'Connected';
      connectBtn.disabled = true;
      disconnectBtn.disabled = false;
      break;
    case 'connecting':
      statusText.textContent = 'Connecting...';
      connectBtn.disabled = true;
      disconnectBtn.disabled = true;
      break;
    case 'disconnected':
    default:
      statusText.textContent = 'Disconnected';
      connectBtn.disabled = false;
      disconnectBtn.disabled = true;
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
    log(`Invalid JSON received: ${e.message}`, 'error');
    return;
  }

  const { id, command, params } = request;
  log(`Received: ${command}`);

  // Find handler
  const handler = commands[command];
  if (!handler) {
    sendResponse(id, {
      ok: false,
      changed: false,
      error: `Unknown command: ${command}`,
    });
    return;
  }

  // Execute command
  try {
    const result = await handler(params || {});
    sendResponse(id, result);
    log(`Completed: ${command}`, 'success');
  } catch (error) {
    log(`Error in ${command}: ${error.message}`, 'error');
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
    log('Cannot send response: WebSocket not connected', 'error');
    return;
  }

  const payload = JSON.stringify({ id, ...response });
  ws.send(payload);
}

/**
 * Connect to WebSocket server
 */
function connect() {
  const url = serverUrlInput?.value || 'ws://localhost:8765';

  if (ws) {
    ws.close();
  }

  updateStatus('connecting');
  log(`Connecting to ${url}...`);

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      updateStatus('connected');
      log('Connected to MCP server', 'success');
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      updateStatus('disconnected');
      log(`Disconnected: ${event.reason || 'Connection closed'}`, 'info');
      ws = null;
    };

    ws.onerror = (error) => {
      log(`WebSocket error: ${error.message || 'Unknown error'}`, 'error');
    };
  } catch (error) {
    updateStatus('disconnected');
    log(`Failed to connect: ${error.message}`, 'error');
  }
}

/**
 * Disconnect from WebSocket server
 */
function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
  updateStatus('disconnected');
  log('Disconnected manually');
}

/**
 * Initialize the panel UI
 */
function initPanel() {
  statusIndicator = document.getElementById('statusIndicator');
  statusText = document.getElementById('statusText');
  connectBtn = document.getElementById('connectBtn');
  disconnectBtn = document.getElementById('disconnectBtn');
  serverUrlInput = document.getElementById('serverUrl');
  logContainer = document.getElementById('logContainer');

  if (connectBtn) {
    connectBtn.addEventListener('click', connect);
  }

  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', disconnect);
  }

  updateStatus('disconnected');
  log('MCP Bridge initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPanel);
} else {
  initPanel();
}

// Export for testing
module.exports = {
  connect,
  disconnect,
  commands,
};

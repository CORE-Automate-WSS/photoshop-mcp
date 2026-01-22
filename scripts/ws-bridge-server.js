/**
 * WebSocket Bridge Server
 *
 * Simple relay server that sits between the MCP server and the UXP plugin.
 * The UXP plugin connects as a client, and the MCP server also connects as a client.
 * This server relays messages between them.
 *
 * Usage: node scripts/ws-bridge-server.js
 */

const WebSocket = require('ws');

const PORT = process.env.WS_PORT || 8765;

const wss = new WebSocket.Server({ port: PORT });

let uxpClient = null;
let mcpClient = null;

console.log(`WebSocket Bridge Server starting on port ${PORT}...`);

wss.on('connection', (ws, req) => {
  const clientType = req.url === '/mcp' ? 'mcp' : 'uxp';

  console.log(`[${new Date().toISOString()}] ${clientType.toUpperCase()} client connected`);

  if (clientType === 'mcp') {
    mcpClient = ws;
  } else {
    uxpClient = ws;
  }

  ws.on('message', (data) => {
    const message = data.toString();
    console.log(`[${new Date().toISOString()}] ${clientType.toUpperCase()} -> ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    // Relay to the other client
    if (clientType === 'mcp' && uxpClient && uxpClient.readyState === WebSocket.OPEN) {
      uxpClient.send(message);
    } else if (clientType === 'uxp' && mcpClient && mcpClient.readyState === WebSocket.OPEN) {
      mcpClient.send(message);
    } else {
      console.log(`[${new Date().toISOString()}] WARNING: No ${clientType === 'mcp' ? 'UXP' : 'MCP'} client connected to relay to`);
    }
  });

  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] ${clientType.toUpperCase()} client disconnected`);
    if (clientType === 'mcp') {
      mcpClient = null;
    } else {
      uxpClient = null;
    }
  });

  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] ${clientType.toUpperCase()} error:`, error.message);
  });
});

wss.on('listening', () => {
  console.log(`[${new Date().toISOString()}] Bridge server listening on ws://localhost:${PORT}`);
  console.log(`  - UXP plugin should connect to: ws://localhost:${PORT}`);
  console.log(`  - MCP server should connect to: ws://localhost:${PORT}/mcp`);
});

wss.on('error', (error) => {
  console.error('Server error:', error.message);
  process.exit(1);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  wss.close();
  process.exit(0);
});

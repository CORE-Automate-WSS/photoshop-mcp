# Photoshop MCP Server

MCP server that exposes Photoshop editing tools as deterministic, reversible operations, enabling Claude to control Photoshop via tool calls.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Claude/Client  │────▶│   MCP Server     │────▶│  UXP Plugin     │
│                 │◀────│  (Node.js)       │◀────│  (Photoshop)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
       stdio              WebSocket (8765)         batchPlay/DOM
```

## Quick Start

### 1. Install MCP Server

```bash
cd packages/mcp-server
npm install
npm run build
```

### 2. Load UXP Plugin in Photoshop

1. Open Adobe UXP Developer Tool (UDT)
2. Click "Add Plugin" and select `packages/ps-uxp-bridge`
3. Click "Load" to load the plugin into Photoshop
4. In Photoshop, open Plugins > MCP Bridge panel

### 3. Connect the Plugin

1. In the MCP Bridge panel, ensure the WebSocket URL is `ws://localhost:8765`
2. Click "Connect"

### 4. Configure Claude Desktop

Add to your Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "photoshop": {
      "command": "node",
      "args": ["C:\\SCRIPTS\\photoshopMCPTest\\packages\\mcp-server\\dist\\index.js"],
      "env": {
        "PS_BRIDGE_URL": "ws://localhost:8765"
      }
    }
  }
}
```

## Available Tools

### App
- `ps.app.get_info` - Get Photoshop version and platform info
- `ps.echo` - Test tool (no Photoshop required)

### Document
- `ps.doc.get_active` - Get active document info
- `ps.doc.open` - Open a document
- `ps.doc.save` - Save the current document
- `ps.doc.save_as` - Save to a new path

### Layer
- `ps.layer.list` - List all layers
- `ps.layer.select` - Select a layer by ID
- `ps.layer.rename` - Rename a layer
- `ps.layer.set_visibility` - Show/hide a layer
- `ps.layer.set_opacity` - Set layer opacity

## Development

### Testing the MCP Server

```bash
# Run the echo test (no Photoshop needed)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ps.echo","arguments":{"message":"hello"}}}' | node packages/mcp-server/dist/index.js
```

### Debugging

Set `LOG_LEVEL=debug` for verbose logging:

```bash
LOG_LEVEL=debug node packages/mcp-server/dist/index.js
```

### WebSocket Architecture

The MCP server **runs a WebSocket server** on port 8765 (configurable via `PS_BRIDGE_PORT`).

The UXP plugin acts as a WebSocket **client** that connects to the MCP server. This means:
1. Start the MCP server first (it starts the WebSocket server automatically)
2. Then connect the UXP plugin from Photoshop

## Project Structure

```
photoshop-mcp/
├── packages/
│   ├── mcp-server/           # Node.js MCP server
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point
│   │   │   ├── tools/        # Tool definitions
│   │   │   ├── bridge/       # WebSocket client
│   │   │   └── logging/      # Audit logging
│   │   └── dist/             # Compiled output
│   │
│   └── ps-uxp-bridge/        # UXP Plugin
│       ├── manifest.json     # Plugin manifest
│       └── src/
│           ├── main.js       # Plugin entry
│           └── commands/     # Photoshop commands
│
├── docs/                     # Documentation
└── samples/                  # Example recipes
```

## Requirements

- Node.js 18+
- Photoshop 23.3.0+ (for manifest v5 support)
- Adobe UXP Developer Tool

## License

MIT

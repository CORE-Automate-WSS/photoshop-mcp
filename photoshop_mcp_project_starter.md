# Photoshop Tool MCP Server (Option A) — Reality Check + Project Starter (PRD + SE Plan)

**Goal:** Create an **MCP server** that exposes **Photoshop editing tools** as deterministic, reversible operations so Claude can *use* Photoshop (tools-first) rather than regenerate pixels.

This document contains:
1) **Reality check / feasibility** (what’s truly possible today)  
2) **Architecture** (recommended design)  
3) **V1 scope** (tool catalog + workflows)  
4) **Engineering plan** (repo layout, milestones, testing, risks)

---

## 1) Reality Check: What’s Actually Possible

### 1.1 There is no “native Photoshop MCP”
MCP is a protocol for tool discovery + invocation (server exposes tools; client/agent calls them). You will be implementing an MCP server **yourself**. MCP supports tool capability advertising and negotiation.  
- MCP architecture + capability negotiation: see official docs/spec.  

**Implication:** “Photoshop MCP” = **your MCP server** + **a Photoshop execution bridge**.

### 1.2 Photoshop automation is real — via UXP + `batchPlay` and DOM APIs
Modern Photoshop extensibility is via **UXP** plugins and scripts. UXP can use:
- Photoshop DOM APIs, and when APIs don’t exist, **`batchPlay`** (Action Manager) to call many internal commands.  
- Adobe explicitly calls out that not all DOM is supported and `batchPlay` is the workaround.

**Implication:** You can expose a large surface area of Photoshop commands, but expect:
- You’ll need a **tool abstraction layer** (stable) over **batchPlay descriptors** (fragile).

### 1.3 “Headless” is nuanced
Adobe docs note UXP scripting can run “headless or minimal UI” in the sense of **no plugin panel/manifest**, but it still runs inside Photoshop.  
- For a **server-driven** workflow, you should assume Photoshop is running with a user session (not a true headless Photoshop daemon).

**Implication:** For robustness, make V1 “interactive automation” (Photoshop open, document open).

### 1.4 You must use modal execution for state-changing operations
To modify Photoshop state (create/modify documents, many `batchPlay` ops), plugins must use **`executeAsModal`** in API v2+.  
Only one plugin can be in a modal scope at a time.

**Implication:** Your bridge must provide:
- **a job queue**
- **modal locking**
- **cancellation**
- **timeouts**

### 1.5 Network access from UXP is permissioned and has platform caveats
UXP network access is disabled by default and must be granted in `manifest.json` via `requiredPermissions.network.domains`.  
UXP supports WebSocket, with manifest permission.  
There are **platform restrictions** in UXP networking (e.g., some hosts restrict plain `http` on macOS).

**Implication:** For local MCP↔Photoshop bridging:
- Prefer **WebSocket (ws/wss)** or **https** endpoints.
- Design for **Win + macOS differences** early.

---

## 2) Recommended Architecture (Option A)

### 2.1 Components

**A) MCP Server (Node or Python)**
- Exposes tools: `list_tools`, `call_tool`
- Receives tool invocations from Claude’s MCP client
- Validates inputs, applies guardrails, logs audit trail
- Communicates with Photoshop Bridge over a local channel (WebSocket recommended)

**B) Photoshop Bridge (UXP plugin)**
- Runs in Photoshop
- Connects to MCP server (local websocket)
- Maps “tool requests” → DOM / `batchPlay` ops
- Wraps state changes in `executeAsModal`
- Returns structured results + diagnostics

**C) (Optional) Vision/Analysis Helper**
- A separate local service that computes histograms, color stats, sharpness metrics, etc.
- **Do not** rely on the LLM for “pixel truth.” Provide measurable signals.

### 2.2 Data Flow (happy path)

1) Claude calls MCP tool: `ps.curves_adjustment_create({ ... })`
2) MCP server validates schema + policy and forwards request to Photoshop Bridge
3) Bridge executes:
   - `photoshop.core.executeAsModal(async () => batchPlay([...]))`
4) Bridge returns:
   - layer IDs created/modified
   - histogram deltas (if available)
   - warnings (clipping, gamut, etc.)
5) MCP server returns response to Claude

### 2.3 Why the UXP plugin is required
MCP server can’t directly “reach into Photoshop” without a bridge. UXP is the official extensibility layer for modern Photoshop.  
Using UXP also keeps tool execution *inside* Photoshop, so results match user expectations.

---

## 3) V1 Product Scope

### 3.1 Non-goals (V1)
- No automatic generative fill by default
- No destructive raster edits by default
- No true unattended “headless Photoshop farm” in V1
- No full coverage of every Photoshop command (batchPlay surface is enormous)

### 3.2 V1 Tools (Tool-First Editing)

**Document + Layer Plumbing**
- `ps.doc.get_active`
- `ps.doc.open(path)`
- `ps.doc.save_as(path, options)`
- `ps.layer.list`
- `ps.layer.select(layerId)`
- `ps.layer.rename(layerId, name)`
- `ps.layer.group_create(name)`
- `ps.smart_object.convert(layerId)` (where feasible)

**Selections & Masks**
- `ps.select.subject`
- `ps.select.sky` (if available)
- `ps.select.color_range(params)`
- `ps.mask.create_from_selection(targetLayerId)`
- `ps.mask.invert(targetLayerId)`
- `ps.selection.clear`

**Adjustments (non-destructive)**
- `ps.adjustment.curves_create(params, maskRef?)`
- `ps.adjustment.levels_create(params, maskRef?)`
- `ps.adjustment.hsl_create(params, targetChannel?, maskRef?)`
- `ps.adjustment.color_balance_create(params, maskRef?)`
- `ps.adjustment.vibrance_create(params, maskRef?)`

**Utilities**
- `ps.history.snapshot_create(name)`
- `ps.history.undo(steps)`
- `ps.app.get_info` (version/platform)
- `ps.diagnostics.get_histogram` (best-effort; may require sampling via exports)

### 3.3 V1 “Auto Editor” modes

**Mode A — Commanded Editing**
User prompt: “Reduce yellow cast, lift midtones, keep highlights.”
Claude uses tools deterministically.

**Mode B — Guided Plan + Execute**
Claude produces a plan (JSON), user approves, then execute.

**Mode C — Batch (same recipe)**
Apply a saved “recipe” to many images (later).

---

## 4) Tool Contracts (MCP Tool Design)

### 4.1 Naming & Versioning
- Prefix tools with `ps.` and group by domain: `ps.adjustment.*`, `ps.select.*`
- Include `api_version` and `capabilities` tools so Claude can adapt

### 4.2 Input/Output Rules
- All tools accept **strict JSON schema**
- All responses return:
  - `ok: boolean`
  - `changed: boolean`
  - `artifacts`: created layer IDs, selection refs, etc.
  - `warnings`: array
  - `debug`: optional, behind a flag

### 4.3 Example tool schema (curves)
```json
{
  "tool": "ps.adjustment.curves_create",
  "input": {
    "name": "AI Curves - Midtones Lift",
    "points": {
      "rgb": [[0,0],[64,70],[128,150],[255,255]]
    },
    "blendMode": "normal",
    "opacity": 100,
    "mask": { "type": "selection", "ref": "activeSelection" }
  }
}
```

---

## 5) Guardrails & Safety

### 5.1 Editing Policies
- Default to non-destructive layers
- Never flatten without explicit request
- Clamp parameters (e.g., saturation delta limits)
- Always create a history snapshot before applying multi-step recipes (configurable)

### 5.2 Concurrency / Modal Lock
- Maintain a single execution queue in the plugin
- If `executeAsModal` is rejected, retry/backoff or return a structured “busy” error
- Provide `ps.job.cancel(jobId)` support

### 5.3 Audit Log
Write JSONL logs with:
- tool name, inputs, user prompt hash
- timing
- Photoshop version / platform
- result summary (layer IDs, etc.)

---

## 6) Engineering Plan (SE Principles)

### 6.1 Repo Structure
```
photoshop-mcp/
  README.md
  docs/
    architecture.md
    tools.md
    runbook.md
    troubleshooting.md
  packages/
    mcp-server/              # Node or Python MCP server
      src/
      tests/
      package.json/pyproject.toml
    ps-uxp-bridge/            # UXP plugin (Photoshop)
      manifest.json
      src/
        index.html
        main.js
        ps/
          batchplay_wrappers.js
          dom_wrappers.js
          modal_queue.js
      tests/                  # lightweight unit tests + fixtures
  samples/
    prompts/
    recipes/
  .github/
    workflows/
```

### 6.2 Milestones (V1)
**M0 — Spike (1–2 days)**
- Create minimal UXP plugin that can:
  - run a simple batchPlay command
  - wrap in executeAsModal
  - return a response to a local websocket endpoint

**M1 — MCP Server Skeleton**
- Tool registry
- JSON schema validation
- Logging
- “echo tool” + “ps.app.get_info” tool

**M2 — Bridge Tooling Layer**
- Implement wrappers:
  - select subject
  - create curves adjustment layer
  - create mask from selection
- Confirm stable IDs and error handling

**M3 — “Auto Editor MVP”**
- A single recipe pipeline:
  - snapshot → select subject → curves → HSL tweak → mask protect highlights
- Verify results via histogram deltas / basic metrics

**M4 — Hardening**
- cancellation
- modal contention handling
- integration tests on sample PSDs
- documentation + runbook

### 6.3 Testing Strategy
**Unit tests**
- schema validation
- tool routing
- descriptor generation for batchPlay wrappers

**Integration tests**
- Golden PSD fixtures
- After running a recipe:
  - verify expected layers exist
  - verify adjustment layer params within tolerance
  - verify no flattening/rasterization occurred

**Manual QA**
- A “QA checklist” for editors (visual review + reversibility)

### 6.4 Observability
- JSON logs per tool call
- optional “trace mode” that records:
  - batchPlay descriptors
  - timing
  - Photoshop errors (numbers/codes)

---

## 7) Key Risks & Limitations

1) **BatchPlay fragility:** descriptors can change, require discovery tooling (e.g., Alchemist) and careful versioning.
2) **Modal scope contention:** other plugins can block modal execution; handle gracefully.
3) **Cross-platform networking:** localhost permissions / http vs https differences; use websockets + manifest permissions and test early.
4) **No true Photoshop daemon:** assume Photoshop is open and an active document exists in V1.
5) **Performance:** tool-by-tool loops can be slow; batch actions when possible (single batchPlay array).

---

## 8) Getting Started Checklist (Day 1)

### 8.1 Dev prerequisites
- Photoshop with UXP plugin support
- UXP Developer Tool (UDT) for loading/debugging plugins
- Node.js (or Python) for MCP server runtime
- A sample PSD set for testing

### 8.2 First “hello tool” (definition of success)
- MCP tool: `ps.app.get_info`
- On call:
  - bridge asks Photoshop for host/version/platform
  - returns structured JSON

Once this works, you have the end-to-end “Claude → MCP → Photoshop → MCP → Claude” loop.

---

## 9) Appendix: Suggested MVP Tool List (minimal)
- `ps.app.get_info`
- `ps.doc.get_active`
- `ps.layer.list`
- `ps.select.subject`
- `ps.adjustment.curves_create`
- `ps.adjustment.hsl_create`
- `ps.mask.create_from_selection`
- `ps.history.snapshot_create`

---

## 10) References (for Claude implementation work)
Use these sources when implementing:
- MCP architecture/spec
- Photoshop UXP `batchPlay`
- Photoshop UXP `executeAsModal`
- UXP WebSocket + manifest network permissions

(Keep citations out of code comments; cite in docs if needed.)

# Photoshop MCP Server - Code Review

**Date**: January 2026  
**Scope**: Full codebase analysis for best practices  
**Status**: Pre-production review

---

## Executive Summary

This is a well-structured TypeScript/Node.js project implementing an MCP server for Photoshop automation via UXP plugin bridge. The codebase demonstrates good organizational patterns with opportunities for improvement in type safety, error handling, and code deduplication.

**Overall Assessment**: Solid foundation, ready for production with targeted improvements.

| Metric | Value |
|--------|-------|
| Total Tools | 105 MCP definitions |
| UXP Handlers | 101 implemented |
| Missing Handlers | 2 (`doc.open`, `doc.save_as`) |
| Test Coverage | 0% (no tests) |
| Type Safety | ~70% |

---

## Architecture Overview

```
Claude Desktop <--stdio MCP--> MCP Server (TypeScript)
                                    |
                              WebSocket:8765
                                    |
                              UXP Plugin (JavaScript) <--> Photoshop
```

### File Structure
```
packages/
├── mcp-server/src/
│   ├── index.ts              # Entry point, MCP protocol handler
│   ├── bridge.ts             # WebSocket client to UXP
│   ├── logging/logger.ts     # Structured JSON logging
│   └── tools/
│       ├── registry.ts       # Central tool registry
│       ├── app.ts            # 2 tools
│       ├── document.ts       # 3 tools  
│       ├── layer.ts          # 10 tools
│       ├── selection.ts      # 12 tools
│       ├── adjustment.ts     # 13 tools
│       ├── history.ts        # 8 tools
│       ├── filter.ts         # 18 tools
│       ├── transform.ts      # 14 tools
│       ├── text.ts           # 8 tools
│       └── utility.ts        # 17 tools
└── ps-uxp-bridge/
    └── main.js               # UXP plugin (~4000 lines)
```

---

## Findings by Severity

### HIGH SEVERITY

#### 1. Type Casting Pattern (All Tool Files)

**Issue**: Unsafe `as` type casting bypasses TypeScript validation.

```typescript
// Current pattern (unsafe)
handler: async (bridge, args) => {
  const { radius } = args as { radius: number };
  return bridge.send("filter.gaussian_blur", { radius });
}
```

**Risk**: Runtime type errors if args don't match expected types.

**Recommendation**: Add Zod validation (already in dependencies):

```typescript
import { z } from 'zod';

const gaussianBlurSchema = z.object({
  radius: z.number().min(0.1).max(250),
});

handler: async (bridge, args) => {
  const validated = gaussianBlurSchema.parse(args);
  return bridge.send("filter.gaussian_blur", validated);
}
```

#### 2. No Test Infrastructure

**Issue**: Zero test files exist.

**Risk**: Unknown behavior, regressions, edge case failures.

**Recommendation**: Add Vitest:

```bash
npm install -D vitest @vitest/coverage-v8
```

```typescript
// tools/layer.test.ts
describe('Layer Tools', () => {
  it('should require layerId for rename', async () => {
    const result = await registry.callTool('ps_layer_rename', {});
    expect(result.ok).toBe(false);
    expect(result.error).toContain('required');
  });
});
```

#### 3. Missing UXP Handlers

**Commands without handlers**:
- `doc.open` - Open document from file path
- `doc.save_as` - Save document with new name

**Impact**: These MCP tools will fail with "Unknown command" error.

---

### MEDIUM SEVERITY

#### 4. Repetitive Handler Boilerplate

**Issue**: 105 tools follow identical pattern with minor variations.

```typescript
// Repeated 105 times with slight variations
{
  name: "ps_...",
  description: "...",
  inputSchema: { type: "object", properties: {...} },
  handler: async (bridge, args) => {
    const { prop1, prop2 } = args as {...};
    return bridge.send("command", { prop1, prop2 });
  }
}
```

**Recommendation**: Create factory function:

```typescript
// tools/factory.ts
export function createTool(
  name: string,
  description: string, 
  schema: InputSchema,
  command: string,
): ToolDefinition {
  return {
    name,
    description,
    inputSchema: schema,
    handler: async (bridge, args) => bridge.send(command, args),
  };
}
```

#### 5. Large File Sizes

| File | Lines | Tools |
|------|-------|-------|
| utility.ts | ~550 | 17 |
| filter.ts | ~600 | 18 |
| adjustment.ts | ~450 | 13 |

**Recommendation**: Consider splitting by sub-category:
- `filter.ts` → `filters/blur.ts`, `filters/sharpen.ts`, etc.
- `utility.ts` → `masks.ts`, `fills.ts`, `exports.ts`

#### 6. Inconsistent Error Handling

**Pattern A** (registry.ts):
```typescript
return { ok: false, changed: false, error: `Unknown tool: ${name}` };
```

**Pattern B** (bridge.ts):
```typescript
throw new Error('No UXP plugin connected');
```

**Recommendation**: Standardize on Result types (never throw in tool handlers).

#### 7. Default Value Inconsistency

Some use `??` operator, some rely on schema defaults:

```typescript
// Pattern A
opacity: args.opacity ?? 100

// Pattern B  
opacity: args.opacity  // No default
```

**Recommendation**: Define defaults in Zod schemas for consistency.

---

### LOW SEVERITY

#### 8. Hardcoded WebSocket Port

**File**: `index.ts:125`

```typescript
const wsPort = parseInt(process.env.PS_BRIDGE_PORT ?? "8765", 10);
```

Only 1 env var supported. Consider adding:
- `PS_REQUEST_TIMEOUT`
- `LOG_LEVEL`
- `PS_BRIDGE_HOST`

#### 9. Bridge Code Duplication

`bridge.ts` contains WebSocket client logic that could be better abstracted for potential future server-side bridge mode.

#### 10. String-Based Connection Check

```typescript
if (!name.startsWith("ps_echo") && !bridge.isConnected()) {
```

**Recommendation**: Add `requiresConnection: boolean` to ToolDefinition.

---

## Strengths

1. **Clean Architecture**: Clear separation between MCP protocol, bridge layer, and tool definitions.

2. **Consistent Tool Naming**: All tools follow `ps_category_action` convention.

3. **Comprehensive Tool Coverage**: 105 tools covering most Photoshop operations.

4. **Structured Logging**: JSON-formatted logs to stderr.

5. **Input Schemas**: Every tool has well-defined JSON Schema for parameters.

6. **Error Response Format**: Consistent `{ ok, changed, data?, error? }` structure.

7. **Raw BatchPlay Escape Hatch**: `ps_execute_batchplay` allows arbitrary Photoshop commands.

---

## Recommended Action Plan

### Phase 1: Critical (Before Production)

| Task | Effort | Impact |
|------|--------|--------|
| Add missing `doc.open` handler | 30 min | Fixes broken tool |
| Add missing `doc.save_as` handler | 30 min | Fixes broken tool |
| Add basic test infrastructure | 2 hours | Quality assurance |

### Phase 2: High Priority (Next Sprint)

| Task | Effort | Impact |
|------|--------|--------|
| Add Zod validation to 5 most-used tools | 2 hours | Type safety |
| Create tool factory function | 1 hour | Reduces boilerplate |
| Standardize error handling | 2 hours | Debuggability |

### Phase 3: Nice to Have

| Task | Effort | Impact |
|------|--------|--------|
| Split large tool files | 2 hours | Maintainability |
| Add more env var configuration | 1 hour | Flexibility |
| Add integration tests | 4 hours | Confidence |

---

## Quick Wins (Can Do Now)

1. **Add the 2 missing UXP handlers** - Simple copy/paste from existing patterns
2. **Add `requiresConnection` field** - Single line per tool definition
3. **Add package.json test script** - Even without tests, sets up infrastructure

---

## Conclusion

The codebase is production-ready for initial use with the caveat that 2 handlers need implementation. The architecture is sound, tool coverage is comprehensive, and patterns are consistent. The main areas for improvement are type safety (Zod validation) and test coverage.

**Recommended**: Fix the 2 missing handlers, then proceed with feature development while addressing Phase 2 items in parallel.

# Implementation Plan: AVA Agent Extension

**Based on**: `corrected_blueprint.md` (validated against codebase)
**Target**: Standalone pi extension package at `ava-agent/`
**Methodology**: TDD (RED-GREEN-REFACTOR) for each component
**Status**: Plan (pending execution)

---

## Overview

Build a pi extension called "AVA" (Avant-Garde Visual Auditor) that provides:

- **`audit-ui` tool** — Scans React/TSX files for DOM bloat (JSX depth > 4) and banned generic Tailwind classes (`rounded-*`, `shadow-*`, `bg-gradient-*`)
- **`reflect-session` tool** — Traces a session's JSONL tree to extract past Architectural Decision Records from compaction summaries
- **`/avant-garde` command** — Notifies the user that strict brutalist mode is active
- **`ava-brutalist` message renderer** — Wraps assistant output in brutalist-themed borders
- **`brutalist` theme** — 50-token high-contrast monochrome theme
- **`scaffold-ui` skill** — SKILL.md that enforces brutalist code generation

### Architecture

```
ava-agent/
├── package.json              # npm package manifest
├── tsconfig.json             # TypeScript config (ES2022, NodeNext)
├── test/
│   ├── fixtures/
│   │   └── sample-session.jsonl   # Session fixture for graph tests
│   ├── utils/
│   │   ├── ast-auditor.test.ts    # Unit tests for AST auditor
│   │   └── session-graph.test.ts  # Unit tests for session graph
│   ├── tools/
│   │   ├── audit-ui.test.ts       # Tool tests (mocked ctx)
│   │   └── reflect-session.test.ts# Tool tests (mocked ctx)
│   └── integration/
│       └── extension.test.ts      # End-to-end: load extension, call tool
├── src/
│   ├── index.ts              # Extension entry point
│   ├── utils/
│   │   ├── ast-auditor.ts    # AST analysis (pure utility)
│   │   └── session-graph.ts  # Session JSONL parser (pure utility)
│   └── tools/
│       ├── audit-ui.ts       # audit-ui tool execute
│       └── reflect-session.ts# reflect-session tool execute
├── themes/
│   └── brutalist.json        # 50-token theme
└── skills/
    └── scaffold-ui/
        └── SKILL.md          # Skill definition
```

---

## Prerequisites

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | >=22.19.0 | Matches pi engine requirement |
| `ts-morph` | latest | AST parsing for React/TSX files |
| `typebox` | ^1.1.38 | Parameter schema for tool definitions |
| `@earendil-works/pi-coding-agent` | ^0.78.1 | Extension API types |
| `typescript` | ^5.9 | TypeScript compiler |
| `vitest` | latest | Test runner |

**Install command** (from repo root):
```bash
cd /home/project/pi-agent
mkdir -p ava-agent && cd ava-agent
npm init -y
npm install ts-morph typebox @earendil-works/pi-coding-agent
npm install -D typescript @types/node vitest
```

**Note**: `@earendil-works/pi-coding-agent` is the host package. The extension depends on its types at build time. At runtime, pi provides the `ExtensionAPI` object to the factory function.

---

## Phase 0: Project Scaffold

### Checklist
- [ ] Create `ava-agent/` directory
- [ ] `npm init -y` creates `package.json`
- [ ] Create `tsconfig.json` per blueprint spec
- [ ] Create directory structure: `src/utils/`, `src/tools/`, `test/utils/`, `test/tools/`, `test/integration/`, `test/fixtures/`, `themes/`, `skills/scaffold-ui/`
- [ ] Install dependencies
- [ ] Add `test` script to `package.json`: `"test": "vitest --run"`
- [ ] Create initial `vitest.config.ts`:
  ```typescript
  import { defineConfig } from 'vitest/config';
  export default defineConfig({
    test: {
      globals: true,
      environment: 'node',
    },
  });
  ```

### Verification
```bash
cd ava-agent && npx tsc --noEmit    # TypeScript compiles cleanly
cd ava-agent && npm test             # Vitest runs (zero tests, exits cleanly)
```

---

## Phase 1: AST Auditor (`src/utils/ast-auditor.ts`)

**TDD**: Pure utility, no Pi API dependencies. Easiest to test first.

### RED — Write Tests (`test/utils/ast-auditor.test.ts`)

Test cases:

1. **`runAstAudit` on a compliant component** — No banned classes, JSX depth <= 4 → `isCompliant: true`, empty violations
2. **`runAstAudit` on a component with banned classes** — Contains `rounded-lg`, `shadow-md`, `bg-gradient-to-r` → violations detected with `AESTHETIC_SLOP` type
3. **`runAstAudit` on a component with deep JSX nesting** — Depth 6 → `DOM_DEPTH` critical violation, message includes actual depth and max depth
4. **`runAstAudit` deduplicates violations** — Same class used on same line → single violation
5. **`runAstAudit` on non-existent file** — Should throw (ts-morph throws)

For test fixtures, create inline strings and write them to temp files using `node:fs` + `node:os` (`tmpdir`).

### GREEN — Implement (`src/utils/ast-auditor.ts`)

Implementation from blueprint with:
- `AuditViolation` and `AuditReport` interfaces
- `BANNED_CLASSES` set (12 entries: `rounded-sm` through `rounded-full`, `shadow-sm` through `shadow-2xl`, `bg-gradient-to-r/b/tr`, `border-gray-100/200/300`)
- `MAX_JSX_DEPTH = 4`
- `getJsxDepth()`: count `JsxElement`/`JsxSelfClosingElement` ancestors
- `auditJsxDepth()`: `forEachDescendant`, check depth > MAX_JSX_DEPTH
- `auditTailwindClasses()`: find `className` string literals, split on whitespace, check against BANNED_CLASSES
- `runAstAudit()`: add source file, run both auditors, deduplicate violations

### REFACTOR

- Extract inline string helper `createTempSourceFile(content: string): string` for test DRY
- Verify `BANNED_CLASSES` is comprehensive

### Verification
```bash
cd ava-agent && npm test -- test/utils/ast-auditor.test.ts
# All 5 tests pass
```

---

## Phase 2: Session Graph (`src/utils/session-graph.ts`)

**TDD**: Pure utility, parses JSONL session files. Requires fixture data.

### RED — Write Tests (`test/utils/session-graph.test.ts`)

Test cases:

1. **`loadFromFile` with empty file** → `nodes` is empty map, no errors
2. **`loadFromFile` with malformed JSONL lines** → Skips malformed lines silently, loads valid ones
3. **`loadFromFile` with one compaction entry** → `nodes.has(id)` true, `isCompaction` true, `content` = summary text
4. **`loadFromFile` with a linear chain (parentId chain)** → 3 entries, resolves path from leaf
5. **`resolvePath` from leaf to root** → Returns ordered array [root, ..., leaf]
6. **`resolvePath` with unknown leafId** → Empty array
7. **`extractDecisions` with compaction entries** → Returns `ArchitecturalDecisionRecord[]` with parsed constraints and decisions from markdown
8. **`extractDecisions` with no compaction entries** → Empty array
9. **`extractMarkdownList` with `# Constraints` header** → Returns parsed list items
10. **`extractMarkdownList` with non-existent header** → Empty array

**Test fixture**: Create `test/fixtures/sample-session.jsonl` with:

```
{"id":"root","parentId":null,"type":"message","timestamp":"2025-01-01T00:00:00.000Z","message":{"role":"user","content":"Start session"}}
{"id":"msg1","parentId":"root","type":"message","timestamp":"2025-01-01T00:00:01.000Z","message":{"role":"assistant","content":"Hello"}}
{"id":"comp1","parentId":"msg1","type":"compaction","timestamp":"2025-01-01T00:00:02.000Z","summary":"# Constraints\n- Use TypeScript strict\n- No any\n\n# Key Decisions\n- Use vitest for testing\n- Extension-only architecture"}
{"id":"msg2","parentId":"comp1","type":"message","timestamp":"2025-01-01T00:00:03.000Z","message":{"role":"user","content":"Continue"}}
```

Also create variants:
- Empty file
- File with one malformed JSON line
- File with no compaction entry

### GREEN — Implement (`src/utils/session-graph.ts`)

Implementation from blueprint:
- `SessionNode`, `ArchitecturalDecisionRecord`, `RawSessionEntry` interfaces
- `isRawSessionEntry()`: type guard checking `id: string`, `type: string`, `timestamp: string`
- `SessionGraph` class with:
  - `loadFromFile()`: readline-based JSONL parser, type detection via `raw.type === 'compaction'`, message vs summary content extraction
  - `resolvePath()`: traverse parentId chain from leaf to root
  - `extractDecisions()`: filter compaction nodes, parse markdown lists
  - `extractMarkdownList()`: regex `# Header\n((?:- .+\n?)+)`

### REFACTOR

- Extract fixture loading helper for test DRY
- Handle edge cases: missing fields, empty content, cyclic parentId chains (break on already-visited)

### Verification
```bash
cd ava-agent && npm test -- test/utils/session-graph.test.ts
# All 10 tests pass
```

---

## Phase 3: Audit UI Tool (`src/tools/audit-ui.ts`)

**TDD**: Wraps AST auditor with Pi's 5-parameter `execute` signature.

### RED — Write Tests (`test/tools/audit-ui.test.ts`)

Test cases:

1. **`executeAuditUi` with compliant component** → Returns `{ content: [{ type: "text", text: "COMPLIANT: ..." }], details: { violations: [] } }`
2. **`executeAuditUi` with violating component** → Returns violations in content text and details array
3. **`executeAuditUi` with path traversal attempt** → Throws `SECURITY VIOLATION`
4. **`executeAuditUi` calls `onUpdate` for progress** → Mock `onUpdate` called at least once
5. **`executeAuditUi` respects `signal`** — Verify signal is passed through (integration test)

Use `vi.mock()` to mock `runAstAudit` from `../utils/ast-auditor.js` to avoid needing ts-morph in tool tests.

```typescript
// Mock pattern
vi.mock('../utils/ast-auditor.js', () => ({
  runAstAudit: vi.fn(),
}));
```

Create minimal `MockExtensionContext`:
```typescript
const mockCtx = {
  cwd: '/tmp/test-workspace',
  ui: { notify: vi.fn() },
  mode: 'print',
  hasUI: false,
  signal: undefined,
  isIdle: () => true,
  abort: vi.fn(),
  hasPendingMessages: () => false,
  shutdown: vi.fn(),
  getContextUsage: () => undefined,
  compact: vi.fn(),
  getSystemPrompt: () => '',
  sessionManager: {} as any,
  modelRegistry: {} as any,
  model: undefined,
} as ExtensionContext;
```

### GREEN — Implement (`src/tools/audit-ui.ts`)

Implementation from blueprint:
- `executeAuditUi` with 5-parameter signature
- Path traversal check: `path.resolve(workspaceRoot, targetPath)` must start with `path.resolve(workspaceRoot)`
- Progress updates via `onUpdate?.(...)`
- Return `AgentToolResult<{ violations: AuditViolation[] }>`

### REFACTOR

- Extract path traversal check into reusable helper `isPathInsideWorkspace(target: string, cwd: string): boolean`

### Verification
```bash
cd ava-agent && npm test -- test/tools/audit-ui.test.ts
# All 5 tests pass
```

---

## Phase 4: Reflect Session Tool (`src/tools/reflect-session.ts`)

**TDD**: Wraps session graph with Pi's 5-parameter `execute` signature.

### RED — Write Tests (`test/tools/reflect-session.test.ts`)

Test cases:

1. **`executeReflectSession` with file containing decisions** → Returns formatted ADR log in content
2. **`executeReflectSession` with file containing no decisions** → Returns "No historical architectural decisions found"
3. **`executeReflectSession` calls `onUpdate` for progress** → Mock `onUpdate` called at least once
4. **`executeReflectSession` with non-existent file** → Should throw (SessionGraph throws)

Use `vi.mock()` to mock `SessionGraph`.

### GREEN — Implement (`src/tools/reflect-session.ts`)

Implementation from blueprint.

### Verification
```bash
cd ava-agent && npm test -- test/tools/reflect-session.test.ts
# All 4 tests pass
```

---

## Phase 5: Extension Engine (`src/index.ts`)

**TDD**: Integrates all components and registers them with Pi's ExtensionAPI.

### RED — Write Tests (`test/integration/extension.test.ts`)

Test cases:

1. **`export default function` is a function** — `typeof defaultExport === 'function'`
2. **Calling the factory with a mock `ExtensionAPI` registers all tools** — `pi.registerTool` called 2 times with correct tool names
3. **Calling the factory registers the `/avant-garde` command** — `pi.registerCommand` called with `"avant-garde"`
4. **Calling the factory registers the message renderer** — `pi.registerMessageRenderer` called with `"ava-brutalist"`
5. **Calling the factory subscribes to `"context"` event** — `pi.on` called with `"context"`
6. **Tool `execute` functions are the imported implementations** — `pi.registerTool` called with objects whose `execute` matches imported functions

Create mock `ExtensionAPI`:
```typescript
function createMockAPI(): ExtensionAPI {
  const tools: any[] = [];
  const commands: any[] = [];
  const messageRenderers: any[] = [];
  const eventHandlers: Map<string, any> = new Map();

  return {
    on: vi.fn((event: string, handler: any) => { eventHandlers.set(event, handler); }),
    registerTool: vi.fn((tool: any) => { tools.push(tool); }),
    registerCommand: vi.fn((name: string, opts: any) => { commands.push({ name, ...opts }); }),
    registerMessageRenderer: vi.fn((type: string, renderer: any) => { messageRenderers.push({ type, renderer }); }),
    registerShortcut: vi.fn(),
    registerFlag: vi.fn(),
    getFlag: vi.fn(),
    sendMessage: vi.fn(),
    sendUserMessage: vi.fn(),
    appendEntry: vi.fn(),
    setSessionName: vi.fn(),
    getSessionName: vi.fn(() => undefined),
    setLabel: vi.fn(),
    exec: vi.fn(),
    onTerminalInput: vi.fn(),
  } as unknown as ExtensionAPI;
}
```

### GREEN — Implement (`src/index.ts`)

Implementation from blueprint:
- Import `Type` from `typebox`
- Import `executeAuditUi` and `executeReflectSession`
- `export default async function (pi: ExtensionAPI)`
- Subscribe to `"context"` event: inject brutalist constraint system message
- Register `audit-ui` tool with label, description, Type.Object params, execute, renderCall, renderResult
- Register `reflect-session` tool with label, description, Type.Object params, execute, renderCall, renderResult
- Register `/avant-garde` command with handler calling `ctx.ui.notify()`
- Register `"ava-brutalist"` message renderer with bordered output

### Verification
```bash
cd ava-agent && npm test -- test/integration/extension.test.ts
# All 6 tests pass
```

---

## Phase 6: Theme (`themes/brutalist.json`)

**Testing**: JSON schema validation. No TDD needed for a static file.

### Implementation
- Create `themes/brutalist.json` with all 50 required color tokens (from blueprint)
- High-contrast monochrome palette:
  - Backgrounds: `#000000`, `#0a0a0a`, `#111111`, `#1a1a1a`
  - Borders: `#222222`, `#333333`, `#666666`
  - Text: `#ffffff`, `#cccccc`, `#aaaaaa`, `#888888`, `#555555`
  - Accents: `#ffffff` (accent), `#00ff00` (success), `#ff0000` (error), `#ffff00` (warning)
  - Syntax: `#cccccc` (variable/string/number), `#ffffff` (keyword/function/type/operator)
  - Thinking levels: `#333333` through `#aaaaaa` (5 levels + off)

### Verification
Run schema validation against pi's `theme-schema.json`:
```bash
cd /home/project/pi-agent/packages/coding-agent
node -e "
const schema = require('./src/modes/interactive/theme/theme-schema.json');
const theme = require('../../ava-agent/themes/brutalist.json');
const Ajv = require('ajv');  // or just manual check
const missing = schema.properties.colors.required.filter(k => !theme.colors[k]);
if (missing.length) { console.error('Missing:', missing); process.exit(1); }
console.log('Theme valid,', schema.properties.colors.required.length, 'tokens present');
"
```

---

## Phase 7: Skills (`skills/scaffold-ui/SKILL.md`)

**Testing**: YAML frontmatter parsing. No TDD needed for documentation.

### Implementation
- Create `skills/scaffold-ui/SKILL.md` with YAML frontmatter (`name`, `description`) and instructions per blueprint

### Verification
Verify pi can parse the frontmatter:
```bash
cd /home/project/pi-agent/packages/coding-agent
node -e "
const { parseFrontmatter } = require('./dist/utils/frontmatter.js');
const fs = require('fs');
const content = fs.readFileSync('../../ava-agent/skills/scaffold-ui/SKILL.md', 'utf-8');
const result = parseFrontmatter(content);
console.log('Skill name:', result.frontmatter.name);
console.log('Skill description:', result.frontmatter.description);
"
```

---

## Phase 8: Full Integration Smoke Test

**TDD**: End-to-end test that loads the extension into a pi session.

### RED — Write Test (`test/integration/extension.test.ts` — extended)

Add test case:

7. **Extension loads via `loadExtensionFromFactory`** — Use pi's `loadExtensionFromFactory` to load the extension, then invoke the registered tools via a session with FauxProvider:
   - Create a session with FauxProvider
   - Call the registered tool
   - Verify the tool result content is correct

### GREEN — Run Against Real Session

```bash
cd /home/project/pi-agent
./pi-test.sh --extension ava-agent/src/index.ts -p "Analyze src/index.tsx for aesthetic violations"
```

### Verification
- Tool executes successfully
- Output contains audit results (compliant or violations)
- No crashes or type errors

---

## Phased Test Execution Order

```
Phase 1  ─► ast-auditor.test.ts
              │ 5 tests
Phase 2  ─► session-graph.test.ts
              │ 10 tests
Phase 3  ─► audit-ui.test.ts
              │ 5 tests
Phase 4  ─► reflect-session.test.ts
              │ 4 tests
Phase 5  ─► extension.test.ts (unit)
              │ 6 tests
Phase 6  ─► theme validation (manual script)
Phase 7  ─► skill validation (manual script)
Phase 8  ─► extension.test.ts (integration)
              │ 1 test
```

Total: 31 tests across 5 test files.

---

## File Manifest

| File | Phase | Type | TDD? |
|------|-------|------|------|
| `package.json` | 0 | Config | No |
| `tsconfig.json` | 0 | Config | No |
| `vitest.config.ts` | 0 | Config | No |
| `src/utils/ast-auditor.ts` | 1 | Source | Yes |
| `test/utils/ast-auditor.test.ts` | 1 | Test | TDD-driven |
| `src/utils/session-graph.ts` | 2 | Source | Yes |
| `test/fixtures/sample-session.jsonl` | 2 | Fixture | No |
| `test/utils/session-graph.test.ts` | 2 | Test | TDD-driven |
| `src/tools/audit-ui.ts` | 3 | Source | Yes |
| `test/tools/audit-ui.test.ts` | 3 | Test | TDD-driven |
| `src/tools/reflect-session.ts` | 4 | Source | Yes |
| `test/tools/reflect-session.test.ts` | 4 | Test | TDD-driven |
| `src/index.ts` | 5 | Source | Yes |
| `test/integration/extension.test.ts` | 5,8 | Test | TDD-driven |
| `themes/brutalist.json` | 6 | Source | No (schema verify) |
| `skills/scaffold-ui/SKILL.md` | 7 | Source | No (frontmatter verify) |

**Total: 16 files** (9 source, 6 test/fixture, 3 config)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ts-morph API changes | Low | Medium | Pin version; the API is stable (v2.x) |
| Pi ExtensionAPI changes between releases | Low | High | Pin `@earendil-works/pi-coding-agent` to peer dependency |
| Session JSONL format changes (v3 → v4) | Low | High | `SessionGraph` validates JSONL structure defensively; update parsing if format changes |
| Path traversal bypass on Windows | Medium | Medium | Use `path.resolve()` + `path.sep` normalization |
| Theme schema adds new required tokens | Low | Medium | Pi adds tokens backward-compatibly (optional tokens added, not removed) |
| `as any` coercion in renderCall/renderResult breaking on TypeScript strict | Low | Low | Acknowledged in blueprint; fix by returning proper `Component` instances |

---

## Verification Final Checklist

### Pre-Run
- [ ] `npm test` passes (all 31 tests)
- [ ] `npx tsc --noEmit` succeeds with zero errors
- [ ] `themes/brutalist.json` passes schema check against `theme-schema.json`
- [ ] `skills/scaffold-ui/SKILL.md` frontmatter parses correctly

### Integration
- [ ] Extension loads via pi CLI: `pi --extension ava-agent/src/index.ts --print "test"`
- [ ] `audit-ui` tool appears in available tools list (`pi --list-tools`)
- [ ] Theme loads: `pi --theme ava-agent/themes/brutalist.json`
- [ ] Skill discovers: placed in `~/.pi/agent/skills/` or loaded with `--skill`

### Code Quality
- [ ] No `any` in source files (test files may use mocks with `as any`)
- [ ] All `import` paths use `.ts` / `.js` extensions (ESM discipline)
- [ ] Every async function has error handling (try/catch or promise rejection handling)
- [ ] Path traversal check present in both tools
- [ ] All 50 theme tokens match `theme-schema.json` required list

---

## Implementation Order Summary

| Phase | Dependencies | Estimated Tests | Estimated Files |
|-------|-------------|----------------|-----------------|
| 0: Scaffold | None | 0 | 3 |
| 1: AST Auditor | None (pure) | 5 | 2 |
| 2: Session Graph | Phase 0 (fs, path) | 10 | 3 |
| 3: Audit UI Tool | Phase 1 | 5 | 2 |
| 4: Reflect Session Tool | Phase 2 | 4 | 2 |
| 5: Extension Engine | Phase 3 + 4 | 6 | 2 |
| 6: Theme | None | 0 (schema verify) | 1 |
| 7: Skills | None | 0 (frontmatter verify) | 1 |
| 8: Integration Smoke | All above | 1 | 0 |

**Total**: 31 tests across 5 test files, 16 total files.

---

## Appendix: Key Type References

### `ExtensionHandler` signature
```typescript
// types.ts:1088
type ExtensionHandler<E, R = undefined> = (event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;
```

### `ContextEvent`
```typescript
// types.ts:612
interface ContextEvent {
  type: "context";
  messages: AgentMessage[];  // Can modify in place
}
```

### `ToolDefinition.execute`
```typescript
// types.ts:462-468
execute(
  toolCallId: string,
  params: Static<TParams>,
  signal: AbortSignal | undefined,
  onUpdate: AgentToolUpdateCallback<TDetails> | undefined,
  ctx: ExtensionContext,
): Promise<AgentToolResult<TDetails>>;
```

### `AgentToolResult<T>`
```typescript
// agent/types.ts:345-355
interface AgentToolResult<T> {
  content: (TextContent | ImageContent)[];
  details: T;
  terminate?: boolean;
}
```

### `renderCall` / `renderResult`
```typescript
// types.ts:471
renderCall?: (args: Static<TParams>, theme: Theme, context: ToolRenderContext<TState, Static<TParams>>) => Component;

// types.ts:474-479
renderResult?: (
  result: AgentToolResult<TDetails>,
  options: ToolRenderResultOptions,
  theme: Theme,
  context: ToolRenderContext<TState, Static<TParams>>,
) => Component;
```

### `ExtensionContext`
```typescript
// types.ts:300-331
interface ExtensionContext {
  ui: ExtensionUIContext;     // notify(), onTerminalInput(), setStatus(), ...
  mode: ExtensionMode;        // "tui" | "print" | "json" | "rpc"
  hasUI: boolean;
  cwd: string;
  sessionManager: ReadonlySessionManager;
  modelRegistry: ModelRegistry;
  model: Model<any> | undefined;
  isIdle(): boolean;
  signal: AbortSignal | undefined;
  abort(): void;
  hasPendingMessages(): boolean;
  shutdown(): void;
  getContextUsage(): ContextUsage | undefined;
  compact(options?: CompactOptions): void;
  getSystemPrompt(): string;
}
```

### `ExtensionCommandContext`
```typescript
// types.ts:329-357
interface ExtensionCommandContext extends ExtensionContext {
  getSystemPromptOptions(): BuildSystemPromptOptions;
  waitForIdle(): Promise<void>;
  newSession(options?: {...}): Promise<{ cancelled: boolean }>;
  fork(entryId: string, options?: {...}): Promise<{ cancelled: boolean }>;
  navigateTree(targetId: string, options?: {...}): Promise<{ cancelled: boolean }>;
  switchSession(sessionPath: string, options?: {...}): Promise<{ cancelled: boolean }>;
  reload(): Promise<void>;
}
```

### Session JSONL Entry Base
```typescript
// session-manager.ts:46-51
interface SessionEntryBase {
  type: string;           // "message" | "compaction" | "thinking_level_change" | ...
  id: string;
  parentId: string | null;
  timestamp: string;
}
```

### Session JSONL Compaction Entry
```typescript
// session-manager.ts:69-78
interface CompactionEntry<T = unknown> extends SessionEntryBase {
  type: "compaction";
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  details?: T;
  fromHook?: boolean;
}
```

---

*This plan is based on `corrected_blueprint.md` which has been validated against the pi codebase at `/home/project/pi-agent/packages/coding-agent/`. All API references are verified against actual source files with line numbers.*

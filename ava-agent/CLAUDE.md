# CLAUDE.md — AVA Agent Extension

Context for AI coding assistants working on this codebase.

## Project Overview

Pi extension written in TypeScript. Registers two tools (`audit-ui`, `reflect-session`), a command (`avant-garde`), a message renderer (`ava-brutalist`), and a theme (`brutalist`). Depends on `@earendil-works/pi-coding-agent` for ExtensionAPI types and `ts-morph` for AST analysis.

## Architecture

- **ESM only** — `"type": "module"` in package.json
- **NodeNext** resolution — imports use `.js` extension even for `.ts` files
- **Pure utilities** — `src/utils/` has no Pi dependencies; testable in isolation
- **Tool wrappers** — `src/tools/` wrap utilities in Pi's 5-parameter `execute` signature
- **Extension entry** — `src/index.ts` default export receives `ExtensionAPI`

## Coding Conventions

- Strict TypeScript — `strict: true`, `noUncheckedIndexedAccess: true`
- No `any` in source files (test mocks may use `as any`)
- Tabs, 120-character line width (Biome 2.3.5)
- Node.js ≥22.19.0

## Key Files

```
src/index.ts              — Extension registration (tools, commands, renderers, events)
src/utils/ast-auditor.ts  — runAstAudit(project, filePath): AuditReport
src/utils/session-graph.ts — SessionGraph class: loadFromFile, resolvePath, extractDecisions
src/tools/audit-ui.ts      — executeAuditUi(toolCallId, params, signal, onUpdate, ctx)
src/tools/reflect-session.ts — executeReflectSession(toolCallId, params, signal, onUpdate, ctx)
```

## ExtensionAPI Usage Patterns

### Registering a tool
```typescript
pi.registerTool({
  name: 'audit-ui',
  label: 'Audit UI',                    // REQUIRED — blueprint fix #1
  description: '...',
  parameters: Type.Object({ ... }),       // typebox, NOT @sinclair/typebox
  execute: executeAuditUi,
  renderCall: (args, _theme, _context) => `...` as any,
  renderResult: (result, _options, _theme, _context) => `...` as any,
});
```

### Event subscription with message injection
```typescript
pi.on('context', async (event, ctx) => {
  const constraintMessage = { role: 'system', content: '...' };
  // AgentMessage is NOT exported from pi-coding-agent barrel.
  // Use runtime-correct cast:
  (event.messages as unknown[]).push(constraintMessage);
});
```

### Message renderer
```typescript
pi.registerMessageRenderer('ava-brutalist', (message, _options, _theme) => {
  // message is typed as AgentMessage; use structural access for content
  const content = (message as unknown as { content?: string }).content;
  if (content) { return `...` as any; }
  return undefined;
});
```

## Gotchas

1. **AgentMessage not exported** — Cannot `import { AgentMessage }` from `pi-coding-agent`. Use structural access or `as unknown[]` cast on the messages array.

2. **renderCall/renderResult return Component, not string** — The type says `Component` but bare strings work at runtime. For type safety, create `new Text("...")` from `pi-tui`, but that adds a heavy dependency. The `as any` cast is the pragmatic compromise.

3. **Tool execute 5th param is ExtensionContext** — Not a custom `ToolContext`. `ExtensionContext` has `ui`, `mode`, `cwd`, `sessionManager`, etc.

4. **Command handler receives ExtensionCommandContext** — Has additional methods: `waitForIdle()`, `newSession()`, `fork()`, etc.

5. **Session JSONL format** — Uses `parentId` (not `parent`). Compaction entries have `type: "compaction"` and `summary` field. Never `message.content` for compaction.

6. **Package is `typebox`** — NOT `@sinclair/typebox`. Import: `import { Type } from "typebox"`.

7. **Theme requires 51 tokens** — `theme-schema.json` lists 51 required `colors` properties. Missing any causes runtime theme load failure.

## Testing Strategy

- **Pure utilities** — Use ts-morph in-memory files, no disk I/O
- **Tools** — Mock `runAstAudit` and `SessionGraph` to isolate Pi-specific behavior
- **Integration** — Mock `ExtensionAPI` and verify registration calls
- **Fixtures** — 7 JSONL files covering empty, malformed, cyclic, no-compaction, and multi-compaction cases

## Common Tasks

| Task | Approach |
|------|----------|
| Add new banned Tailwind class | Edit `BANNED` Set in `ast-auditor.ts`, add test in `ast-auditor.test.ts` |
| Change max JSX depth | Edit `MAX_DEPTH` constant, update test expectations |
| Add new session graph parser field | Update `RawSessionEntry` interface, handle in `loadFromFile` |
| Add new tool | Follow 5-param signature, add to `src/index.ts`, add integration test |

## Build Commands

```bash
npm test             # vitest --run
npm run watch        # vitest (watch mode)
npm run typecheck    # tsc --noEmit  (zero errors expected)
```
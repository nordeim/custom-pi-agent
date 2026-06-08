# AVA — Avant-Garde Visual Auditor

Pi extension for enforcing brutalist design constraints in React/TSX code. Scans for DOM bloat and banned Tailwind classes, traces session history for architectural decisions, and applies a high-contrast monochrome theme.

## Features

- **`audit-ui` tool** — Scans React/TSX files for JSX depth > 4 and banned Tailwind classes (`rounded-*`, `shadow-*`, `bg-gradient-*`)
- **`reflect-session` tool** — Extracts architectural decision records from session compactions
- **`avant-garde` command** — Activates strict brutalist design mode
- **`ava-brutalist` theme** — 51-token monochrome high-contrast theme
- **`scaffold-ui` skill** — Enforces brutalist constraints on generated components

## Installation

```bash
npm install
npm test        # Verify: 30/30 tests pass
npm run typecheck  # Verify: zero TypeScript errors
```

## Usage

Register the extension with Pi:

```bash
pi --extension /path/to/ava-agent/src/index.ts
```

Invoke tools from the Pi prompt:

```
> audit test.tsx
> reflect session_abc123.jsonl
> /avant-garde
```

## Architecture

```
src/
  index.ts              — Extension entry: registers tools, commands, renderer
tools/
  audit-ui.ts           — Pi tool wrapper (5-param execute signature)
  reflect-session.ts    — Pi tool wrapper
utils/
  ast-auditor.ts        — ts-morph AST analysis (pure, no Pi deps)
  session-graph.ts      — JSONL session parser with cycle detection
test/
  fixtures/             — 7 JSONL files covering edge cases
  utils/                — 15 tests for ast-auditor + session-graph
  tools/                — 9 tests for tool wrappers
  integration/          — 6 tests for ExtensionAPI registration
themes/brutalist.json   — 51-token theme file
skills/scaffold-ui/SKILL.md — YAML frontmatter skill definition
```

## API Reference

### `audit-ui` tool parameters
```typescript
{ targetPath: string }  // Relative path to TSX file
```

### `reflect-session` tool parameters
```typescript
{ sessionFile: string, leafId: string }
```

## Development

| Task | Command |
|------|---------|
| Tests | `npm test` |
| Watch mode | `npm run watch` |
| Type check | `npm run typecheck` |

### Test Matrix

| Component | Tests | Status |
|-----------|-------|--------|
| AST Auditor | 5 | DOM depth, banned classes, dedup, missing file |
| Session Graph | 10 | Empty, malformed, cyclic, linear chain, compactions |
| Audit-UI Tool | 5 | Compliant, violations, path traversal, onUpdate, signal |
| Reflect-Session | 4 | ADR log, no decisions, missing file, onUpdate |
| Extension Engine | 6 | Registration, event subscription, execute binding |
| **Total** | **30** | **All passing** |

## Known Limitations

- `renderCall`/`renderResult` return `Component` but use `as any` (currently returns bare strings; requires `Text` from `@earendil-works/pi-tui` for full type safety)
- `AgentMessage` type is not re-exported from `pi-coding-agent` barrel; use `(event.messages as unknown[]).push(...)` for system message injection
- `ExtensionCommand handler` receives `ExtensionCommandContext`, not plain `ExtensionContext`
- Path traversal check uses `path.resolve()` + `path.sep`; review on Windows

## License

MIT
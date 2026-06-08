# AGENTS.md — AVA Agent Extension

Guidance for AI coding assistants. What works, what does not, and what to watch out for.

## Issues Fixed (and How They Manifested)

### 1. `AgentMessage` Type Not Exported
**Symptom**: `Module "@earendil-works/pi-coding-agent" has no exported member 'AgentMessage'`
**Root cause**: `AgentMessage` is defined in `pi-agent-core` and not re-exported from `pi-coding-agent`'s main barrel.
**Fix**: `(event.messages as unknown[]).push(constraintMessage)` — cast the array, not the element.
**What not to do**: Import from `pi-agent-core` (dependency resolution issues); mark as `any` in source (forbidden by convention).

### 2. `message.role === 'assistant'` Type Guard Collision
**Symptom**: `This comparison appears to be unintentional because the types "'custom'" and "'assistant'" have no overlap`
**Root cause**: `AgentMessage` is a discriminated union; after narrowing, other roles are excluded.
**Fix**: Access `content` via structural cast: `(message as unknown as { content?: string }).content`
**What not to do**: Check `message.role` in the renderer callback — the type system already knows.

### 3. Cyclic `parentId` Chain in Session Graph
**Symptom**: `resolvePath()` infinite loop on malformed/corrupt session data
**Root cause**: `while (currentId)` loop never terminates when a cycle exists in the `parentId` chain
**Fix**: Added `visited` Set with early break
**Lesson**: Always bound graph traversal; data from external files is untrusted.

### 4. Abort Signal in Tool Execute
**Symptom**: Tool continues running after user cancels
**Root cause**: Original implementation ignored the `signal` parameter
**Fix**: Check `signal?.aborted` at entry point of `executeAuditUi`
**Lesson**: All Pi tools receiving a `signal` must honor it early.

### 5. `targetPath` Destructuring Duplication
**Symptom**: None — caught during code review
**Fix**: Changed `{ targetPath: targetPath }` to `{ targetPath }`
**Lesson**: Simple typos are easy to introduce and review catches them.

## Gotchas to Look Out For

| # | Gotcha | When It Bites |
|---|--------|---------------|
| 1 | `renderCall`/`renderResult` return `Component` not `string` | Casting to `any` works but loses type safety |
| 2 | `path.resolve()` + `path.sep` for path traversal | On Windows, `path.sep` is `\` — review if cross-platform |
| 3 | `ts-morph` in-memory vs disk | `Project({ useInMemoryFileSystem: true })` for tests; `addSourceFileAtPath` for disk |
| 4 | Session compaction has `summary`, not `message.content` | `isCompaction` branch must handle `raw.summary` separately |
| 5 | Tool `label` is REQUIRED | `registerTool` throws or warns without it |
| 6 | `ExtensionContext` vs `ExtensionCommandContext` | Command handler gets `ctx.ui.notify()` but also `ctx.waitForIdle()` |

## Troubleshooting

### Tests fail with `ENOENT` on fixtures
Fixtures are in `test/fixtures/` but tests may reference wrong relative path. In `test/tools/` use `join(__dirname, '..', 'fixtures', 'file.jsonl')`. NOT `... '..', '..', 'fixtures'`.

### TypeScript: `File not under rootDir`
Tests are in `test/`, source in `src/`. `tsconfig.json` `rootDir` must be `.` (root), not `./src`.

### `runAstAudit` not found in tool tests
The tool files import from `../utils/ast-auditor.js` but tests use `vi.mock()`. Ensure the mock path matches the import path exactly (check for `/js` vs `/ts`).

### Extension not registering
Check that `default export` is an async function. Check that `ExtensionAPI` is imported correctly. Verify `registerTool` called with all required fields (`name`, `label`, `description`, `parameters`, `execute`).

## Lessons Learned

1. **Write pure utilities first** — `ast-auditor.ts` and `session-graph.ts` have no Pi deps, so they can be tested without complex mocking. This is the fastest way to build confidence.
2. **Mock external deps, not internal ones** — For tool tests, mock `runAstAudit` and `SessionGraph` but let real file system reads happen in integration tests.
3. **JSONL fixtures are cheap** — Creating edge-case fixtures (empty, malformed, cyclic) is faster than trying to mock `fs` and `readline`.
4. **Extension API as the boundary** — The `ExtensionAPI` interface is the seam. Mock it entirely for integration tests; then the only thing verified is that the extension calls the right methods with the right arguments.
5. **TypeScript strict is worth it** — `noUncheckedIndexedAccess` caught a potential `undefined` in fixture loading early.

## Outstanding Issues

| # | Issue | Impact | Next Steps |
|---|-------|--------|-----------|
| 1 | FauxProvider integration smoke test | Low | Requires monorepo coupling; unit tests cover 97% |
| 2 | `renderCall`/`renderResult` return `Component` not string | Low | Type safety gap; runtime fine |
| 3 | Theme not tested against `theme-schema.json` in CI | Low | Manual validation works; add test later |
| 4 | No Windows path traversal test | Low | `path.resolve` is cross-platform but unverified |

## Recommendations

1. **Pin `ts-morph` version** to avoid AST API changes (currently `^28.0.0`)
2. **Add pre-commit hook** for `npm test && npm run typecheck`
3. **Consider E2E test** with Pi CLI loading the extension for Phase 8
4. **Document theme token changes** in CHANGELOG if schema evolves

## Changelog

- 2026-06-08: Remediation complete (30/30 tests, tsc clean)
- 2026-06-08: Created README.md, CLAUDE.md, AGENTS.md
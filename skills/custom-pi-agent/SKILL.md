---
name: custom-pi-agent
description: Build, validate, and implement custom extensions and agents using the pi-coding-agent SDK and ExtensionAPI. Use when creating blueprints for new pi extensions, validating extension API usage against source, planning TDD implementation, or debugging extension registration issues. Triggers on: "build pi extension", "create pi agent", "validate pi blueprint", "plan pi implementation", "pi extension API".
---

Design and implement custom pi-coding-agent extensions. Covers the full cycle: codebase investigation, blueprint validation, corrected blueprint construction, TDD implementation planning.

## Workflow

### Phase 1: Investigate the Codebase

Before touching any code, understand the real API surfaces by reading source files — not docs, not generated types.

1. **Read the extension types file** — `src/core/extensions/types.ts` contains every API consumers use: `ExtensionAPI`, `ExtensionContext`, `ToolDefinition`, `ExtensionHandler`, event interfaces. This is the single source of truth.

2. **Read the session manager** — `src/core/session-manager.ts` for the exact JSONL format: `SessionEntryBase` has `type`, `id`, `parentId`, `timestamp`. `CompactionEntry` has `summary`. Never assume field names.

3. **Read the agent types** — `packages/agent/src/types.ts` for `AgentToolResult<T>` shape: `content: (TextContent | ImageContent)[]`, `details: T`, `terminate?: boolean`.

4. **Read the theme schema** — `src/modes/interactive/theme/theme-schema.json` for the exact 50 required color tokens. Theme validation rejects any file with missing tokens.

5. **Read the package manifest** — `package.json` for the `typebox` dependency (package name is `typebox`, not `@sinclair/typebox`, version 1.1.38).

6. **Read existing extension examples** — `examples/extensions/` for real working patterns: `hello.ts` (minimal tool), `custom-compaction.ts`, `input-transform.ts`.

7. **Read the test harness** — `test/suite/harness.ts` for integration test patterns with `FauxProvider`.

### Phase 2: Validate a Blueprint Against Source

Cross-reference every API claim in the blueprint against the actual source files. Build an evidence chain for each claim.

1. **Extract every API call** from the blueprint: `pi.on()`, `pi.registerTool()`, `pi.registerCommand()`, etc. Search the types file for the exact method signature.

2. **Verify parameter counts and types**: ToolDefinition executes takes exactly 5 parameters `(toolCallId, params, signal, onUpdate, ctx)`. `renderCall` receives `(args, theme, context)` — the first param is the params object directly, not wrapped in `{ params }`. `renderResult` receives `(result, options, theme, context)`.

3. **Check required fields**: ToolDefinition requires both `name` and `label`. `label` is often missed.

4. **Verify event names**: Search the `ExtensionAPI.on()` overloads for the exact event string. Event names are kebab-case: `"session_before_compact"`, not `"onBeforeCompaction"`.

5. **Verify return types**: Command handlers return `Promise<void>`. Tool execute returns `AgentToolResult<TDetails>`. `renderCall`/`renderResult` return `Component` (TUI component, not string).

6. **Check for fabricated APIs**: When a blueprint uses a method not found in source (`injectSystemPrompt()`, `api.subscribe()`), search for the real equivalent and note the replacement.

7. **Verify npm packages**: Pi uses `typebox` (not `@sinclair/typebox`). Verify in `package.json:dependencies`.

8. **Verify session JSONL field names**: The `SessionEntryBase` uses `parentId`, not `parent`. Compaction entries have `type: "compaction"` and `summary: string`, not `message.content`.

9. **Classify every finding**:
   - PASS: claim matches source (cite file:line)
   - FAIL: claim contradicts source (cite file:line, describe fix)
   - INFO: non-critical design issue (acknowledge but don't block)

10. **Build an issue table** with columns:
    - # — issue number
    - Severity (CRITICAL, MODERATE, INFO)
    - Section — where in the blueprint
    - Claim — what the blueprint says
    - Actual — what source says (file:line)
    - Fix — required correction

### Phase 3: Create a Corrected Blueprint

Replace the original flawed document with an authoritative version.

1. **Annotate every fix** with `// FIX:` comments inline in code blocks. Include the evidence chain: `// FIX: Changed to X — confirmed at types.ts:441`.

2. **Fix all CRITICAL errors** first: missing required fields, wrong API signatures, fabricated methods.

3. **Fix MODERATE errors**: wrong npm packages, incomplete theme tokens, wrong JSONL field names.

4. **Add a verification checklist** at the end: table with Check, Evidence, and Status columns. Only mark PASS for items you personally verified against source.

5. **Preserve correct content** — don't rewrite sections that pass validation. Only replace what's wrong.

### Phase 4: Plan TDD Implementation

Structure implementation in dependency order. Each phase writes tests first.

1. **Identify pure utilities** — components with no pi dependency (AST parsers, JSONL readers). These are the easiest to test and should come first. Write unit tests with `vitest`, use temporary files for fixtures.

2. **Identify tool wrappers** — components that wrap pure utilities with pi's 5-parameter `execute` signature. Mock the pure utility with `vi.mock()`. Create a `MockExtensionContext` with only the fields the tool actually uses (minimally `cwd`, `ui.notify`).

3. **Identify the extension engine** — the `index.ts` entry point. Test by creating a `MockExtensionAPI` with `vi.fn()` on every method the extension registers (`registerTool`, `registerCommand`, `registerMessageRenderer`, `on`). Use `as unknown as ExtensionAPI` to satisfy TypeScript.

4. **Order phases by dependency**: pure utilities → tool wrappers → extension engine → static assets (themes, skills).

5. **Use RED-GREEN-REFACTOR for each phase**:
   - RED: Write tests that fail (assert expected behavior)
   - GREEN: Implement until all tests pass
   - REFACTOR: Extract helpers, add edge case handling, deduplicate

6. **Document every test case** in the plan with:
   - What it tests
   - How it sets up (fixtures, mocks)
   - What it asserts

## Pi Extension API Reference

Detailed API signatures in `references/api-reference.md`.

Key surfaces:

- **ExtensionAPI** — `on()`, `registerTool()`, `registerCommand()`, `registerShortcut()`, `registerFlag()`, `getFlag()`, `registerMessageRenderer()`, `sendMessage()`, `sendUserMessage()`, `appendEntry()`, `setSessionName()`, `getSessionName()`, `setLabel()`, `exec()`, `getActiveTools()`, `getAllTools()`, `setActiveTools()`, `getCommands()`, `setModel()`, `getThinkingLevel()`, `setThinkingLevel()`, `registerProvider()`, `registerModel()`
- **ToolDefinition** — `name`, `label`, `description`, `parameters` (TypeBox), `execute` (5-param), `renderCall` (3-param → Component), `renderResult` (4-param → Component), `executionMode?`, `prepareArguments?`, `renderShell?`, `promptSnippet?`, `promptGuidelines?`
- **ExtensionContext** — `ui`, `mode`, `hasUI`, `cwd`, `sessionManager`, `modelRegistry`, `model`, `isIdle()`, `signal`, `abort()`, `hasPendingMessages()`, `shutdown()`, `getContextUsage()`, `compact()`, `getSystemPrompt()`
- **ExtensionCommandContext** extends ExtensionContext with: `getSystemPromptOptions()`, `waitForIdle()`, `newSession()`, `fork()`, `navigateTree()`, `switchSession()`, `reload()`

## Session JSONL Format

Entries follow `SessionEntryBase` (`session-manager.ts:46-51`):

```
{
  type: string;         // "message" | "compaction" | "thinking_level_change" | "model_change" | "branch_summary"
  id: string;
  parentId: string | null;
  timestamp: string;
}
```

Message entries (`SessionMessageEntry`): `message: AgentMessage` with `role` and `content`.
Compaction entries (`CompactionEntry`): `summary: string` — the compaction summary text, not a nested message.

## Theme Requirements

The theme JSON must provide exactly 50 color tokens in the `colors` object. The complete required list in `references/api-reference.md`. Schema: `src/modes/interactive/theme/theme-schema.json`. Colors are `#RRGGBB` hex strings, integer 0-255 palette indices, empty string for terminal default, or variable references (`$name`).

## Key Principles

- **Files are the source of truth, not docs**. When docs conflict with source, trust source. Prefer reading `types.ts`, `session-manager.ts`, `theme-schema.json`, and `package.json` over prose documentation.
- **Build evidence chains** for every claim. Every assertion in a corrected blueprint should cite `file:line` as proof. If you cannot find the evidence, flag the claim as unverified.
- **TDD is not optional**. Pure utilities test first, tool wrappers with mocks second, integration last. Never implement without a failing test.
- **Mock only what the component uses**. A `MockExtensionContext` needs only `cwd` and `ui.notify` if that's all the tool accesses. Use `as unknown as ExtensionContext` to satisfy TypeScript for unused fields.
- **One bug per fix commit**. Each `// FIX:` annotation in the corrected blueprint should fix exactly one issue. Don't bundle unrelated fixes.

## References

- `references/api-reference.md` — Complete Pi extension API types, theme token list, session format
- `references/testing-patterns.md` — TDD patterns, mock factories, fixture examples
- `references/validation-guide.md` — Step-by-step blueprint validation methodology with checklist

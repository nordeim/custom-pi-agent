# Blueprint Validation Guide

Step-by-step methodology for validating a pi extension blueprint against source.

## Prerequisites

Know where the source files live:

| File | Purpose |
|------|---------|
| `packages/coding-agent/src/core/extensions/types.ts` | ExtensionAPI, ToolDefinition, all event types |
| `packages/coding-agent/src/core/session-manager.ts` | SessionEntryBase and entry subtypes |
| `packages/coding-agent/src/modes/interactive/theme/theme-schema.json` | Theme JSON schema, required tokens |
| `packages/coding-agent/package.json` | Dependencies, engine requirement |
| `packages/agent/src/types.ts` | AgentToolResult, AgentTool interface |
| `packages/ai/src/types.ts` | AgentMessage, TextContent, ImageContent |
| `packages/coding-agent/src/core/skills.ts` | SkillFrontmatter, YAML frontmatter parsing |
| `packages/coding-agent/src/core/sdk.ts` | createAgentSession, tool factories |
| `packages/tui/src/components/text.ts` | Text Component class |
| `packages/tui/src/components/box.ts` | Box Component class |

## Phase 1: Extract API Claims

Read the blueprint and extract every API interaction. Categorize by surface:

1. **Event subscriptions**: `pi.on(...)` calls — note the event name and handler shape
2. **Tool registrations**: `pi.registerTool(...)` calls — note all properties including optional ones
3. **Command registrations**: `pi.registerCommand(...)` calls — note handler return type
4. **Renderer registrations**: `pi.registerMessageRenderer(...)` calls
5. **Import paths**: All `import { ... } from "..."` statements
6. **Dependencies**: npm packages listed in `package.json`
7. **Type references**: `ExtensionContext`, `ExtensionAPI`, `AgentToolResult`, etc.
8. **Static files**: Theme JSON, SKILL.md

## Phase 2: Cross-Reference Against Source

For each claim, search the source file and verify. Use exact grep patterns:

```bash
# Find method in ExtensionAPI
grep -n "registerTool" src/core/extensions/types.ts

# Find event overload
grep -n "session_before_compact" src/core/extensions/types.ts

# Find interface fields
grep -A10 "export interface ToolDefinition" src/core/extensions/types.ts

# Find required fields in theme schema
grep -A60 '"required":' src/modes/interactive/theme/theme-schema.json
```

### Verification Categories

**CRITICAL** — Will cause runtime crash:
- Required fields missing (`label` on ToolDefinition)
- Wrong method names (`api.subscribe()` instead of `pi.on()`)
- Fabricated methods (`injectSystemPrompt()`)
- Wrong npm packages (`@sinclair/typebox` instead of `typebox`)
- Wrong parameter counts (execute needs 5 params)
- Wrong field names (`parent` instead of `parentId`)
- Theme missing required tokens (50 required, missing > 30 will fail validation)
- Handler returns wrong type (string instead of void)

**MODERATE** — Functional but incorrect:
- Import from wrong package
- Missing optional doc links in reference
- renderCall/renderResult return string instead of Component
- Incomplete but not missing field types

**INFO** — Non-blocking design note:
- Ignoring optional parameters (theme, context in renderers)
- Coercion hacks (`as any`)
- Unused type parameters

## Phase 3: Build Evidence Chains

Each claim in the corrected blueprint must cite `file:line` as evidence.

Format: `// FIX: [what changed] — confirmed at [file]:[line]`

Examples:
```
// FIX: Added label (required by ToolDefinition at types.ts:441)
// FIX: Changed to (args, theme, context) to match renderCall signature at types.ts:471
// FIX: Use "context" event instead of injectSystemPrompt() — types.ts:612-615, 987-989
```

## Phase 4: Produce the Corrected Document

1. **Structure**: Same sections as original, with `// FIX:` annotations inline
2. **Verification table**: At the end, a table with Check, Evidence, Status
3. **Evidence column**: Must contain file:line references for every PASS
4. **Status column**: Only mark PASS after verifying against source

Example verification table:

```
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | `pi.on()` not `subscribe()` | PASS | `types.ts:1098` |
| 2 | `registerTool` with `label` | PASS | `types.ts:437` |
| 3 | Session JSONL uses `parentId` | PASS | `session-manager.ts:49` |
| 4 | Theme has 50 tokens | PASS | `theme-schema.json:37-88` |
```

## Phase 5: Re-validate the Corrected Blueprint

Run the same checks on the corrected version. Verify every `// FIX:` annotation actually fixed what it claimed. One additional pass catches regression bugs (e.g., `ctx.messages` → `event.messages` — fixed the injectSystemPrompt issue but introduced a param confusion).

### Common Regressions in Corrected Blueprints

- Fixing one method call but using wrong variable (`ctx.messages` instead of `event.messages` in context handler — ExtensionHandler signature is `(event, ctx)`, first param is the event)
- Adding `label` but misspelling it
- Changing import path but forgetting to update the package dependency
- Fixing theme token count but using wrong color value type

## Checklist Template

```
### Phase 2 Checks
[ ] 1. All pi.on() event names match source overloads
[ ] 2. All registerTool() calls include label
[ ] 3. execute has 5 parameters
[ ] 4. execute returns AgentToolResult<T>
[ ] 5. renderCall signature: (args, theme, context)
[ ] 6. renderResult signature: (result, options, theme, context)
[ ] 7. registerCommand handler returns void
[ ] 8. No fabricated methods (injectSystemPrompt, subscribe)
[ ] 9. Session JSONL uses parentId, type field, summary for compaction
[ ] 10. Theme has all 50 required tokens
[ ] 11. Import uses typebox (not @sinclair/typebox)
[ ] 12. ExtensionContext has correct fields (not custom ToolContext)
[ ] 13. registerMessageRenderer returns Component | undefined
[ ] 14. ctx.ui.notify() exists on ExtensionUIContext

### Phase 3 Checks
[ ] 15. Every // FIX: cites file:line evidence
[ ] 16. No fix duplicates another fix

### Phase 4 Checks
[ ] 17. Verification table has all checks
[ ] 18. Every PASS in table has file:line evidence
[ ] 19. No placeholder content (TODO, coming soon)

### Phase 5 Checks
[ ] 20. Re-scanned for regression bugs
[ ] 21. Context handler uses event.messages (not ctx.messages)
```

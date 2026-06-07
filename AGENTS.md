# coding-agent

This is the main product: an interactive coding agent CLI. It depends on `pi-tui`, `pi-ai`, and `pi-agent-core`.

## Architecture

Entry points: `src/cli.ts` (Node), `src/bun/cli.ts` (Bun binary). Both call `main()` in `src/main.ts`.

**Three run modes** (`src/modes/`):
- `interactive/` — Full TUI with differential rendering (pi-tui), components, themes, assets
- `print-mode.ts` — Non-interactive stdout (`--print` flag)
- `rpc/` — JSON-RPC server for programmatic access

**Core abstractions** (`src/core/`):
- `agent-session.ts` — Session lifecycle: state, events, retry loop, compaction
- `sdk.ts` — `createAgentSession()` factory: wires tools, settings, model registry
- `session-manager.ts` — JSONL persistence (session format v3)
- `settings-manager.ts` — Layered settings (global `~/.pi/agent/agent.json` + project `.pi/settings.json`)
- `resource-loader.ts` — Discovers extensions, skills, prompts, themes from project and global dirs
- `trust-manager.ts` — Project trust store (`trust.json` with lockfile)
- `skills.ts` — SKILL.md loading with YAML frontmatter validation
- `prompt-templates.ts` — `/command` expansion with bash-style arg substitution

**7 built-in tools** (`src/core/tools/`): `bash`, `read`, `edit`, `write`, `grep`, `find`, `ls`. Created via factory functions (`createBashTool()`, etc.). Tool sets: `createReadOnlyTools()`, `createCodingTools()`, `createAllTools()`.

**Extension system** (`src/core/extensions/`): Event-driven with lifecycle hooks (agent_start/end, before_provider_request, context, tool calls, etc.). Extensions discovered from `.pi/extensions/` (project), `~/.pi/agent/extensions/` (global), and `builtin/`. 76 example extensions in `examples/extensions/`.

**Migrations** (`src/migrations.ts`): One-time startup migrations for auth, sessions, tools→bin, commands→prompts, keybindings, env var syntax.

## Commands

From repo root:
```bash
./pi-test.sh              # Run coding-agent from source via tsx
./pi-test.sh --no-env     # Without API keys
```

From this package:
```bash
npm run build             # tsgo + chmod + copy-assets (theme JSON, images, HTML templates)
npm run build:binary      # Full Bun binary compilation (builds all deps first)
npm run test              # vitest --run
npm run test:harness      # vitest with harness config
npm run shrinkwrap        # Regenerate npm-shrinkwrap.json
```

`npm run check` (from root) runs: biome lint/format, pinned-deps check, ts-imports check, shrinkwrap check, `tsgo --noEmit`, browser smoke check.

## Testing

Framework: Vitest 3.2.4. Config: `vitest.config.ts` (aliases resolve sibling packages to `src/`).

**Suite tests** (`test/suite/`): Use `test/suite/harness.ts` with `FauxProvider` from pi-ai. No real API keys needed. Includes `test/suite/regressions/` for issue-specific tests named `<issue-number>-<short-slug>.test.ts`.

Running a single test:
```bash
node ../../node_modules/vitest/dist/cli.js --run test/specific.test.ts
```

Never run `vitest --run` from the repo root — it includes e2e tests that activate with env vars. Use `./test.sh` from root instead.

## Key Files

| File | Purpose |
|------|---------|
| `src/cli.ts` | Node entry point |
| `src/bun/cli.ts` | Bun binary entry (adds sandbox restore + Bedrock) |
| `src/main.ts` | CLI arg parsing, mode dispatch, session selection |
| `src/index.ts` | Public SDK barrel exports |
| `src/config.ts` | Package detection, install method, self-update |
| `src/migrations.ts` | Startup migrations |
| `src/core/sdk.ts` | `createAgentSession()` factory |
| `src/core/agent-session.ts` | Core session abstraction |
| `src/core/session-manager.ts` | JSONL session persistence |
| `src/core/settings-manager.ts` | Layered settings with lockfile |
| `src/core/resource-loader.ts` | Extension/skill/prompt discovery |
| `src/core/skills.ts` | SKILL.md loading and validation |
| `src/core/trust-manager.ts` | Project trust store |

## Conventions

- All imports use `.ts` extensions. No `.js` imports in `.ts` files.
- Tools follow factory pattern: `createXToolDefinition()` + `createXTool()`.
- Extensions use event-driven hooks; see `src/core/extensions/types.ts` for the full event enum.
- Settings are typed via separate interfaces (CompactionSettings, RetrySettings, etc.).
- Session format is v3 JSONL with hierarchical entry types (message, thinking_level_change, model_change, branch_summary, compaction, etc.).
- Builtin resources (extensions, skills, themes) live in `builtin/` and are loaded by `DefaultResourceLoader`.

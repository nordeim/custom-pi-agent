---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
---

# coding-agent

Interactive coding agent CLI — the main product of the pi-monorepo. Provides read, bash, edit, write, grep, find, and ls tools with session management, an extension system, and a terminal UI.

**Tech Stack**: TypeScript (strict, ESM), Node.js 22+, Vitest 3.2.4, Biome 2.3.5, tsgo compiler

**Dependencies**: `@earendil-works/pi-tui`, `@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`

## Foundational Principles

### Meticulous Approach (Six-Phase Workflow)

Follow this six-phase workflow for all implementation tasks:

1. **ANALYZE** - Deep, multi-dimensional requirement mining
   - Never make surface-level assumptions
   - Identify explicit requirements, implicit needs, and potential ambiguities
   - Explore multiple solution approaches
   - Perform risk assessment

2. **PLAN** - Structured execution roadmap
   - Create detailed plan with sequential phases
   - Present plan for explicit user confirmation
   - Never proceed without validation

3. **VALIDATE** - Explicit confirmation checkpoint
   - Obtain explicit user approval before implementation
   - Address any concerns or modifications

4. **IMPLEMENT** - Modular, tested, documented builds
   - Set up proper environment
   - Implement in logical, testable components
   - Create documentation alongside code

5. **VERIFY** - Rigorous QA against success criteria
   - Execute comprehensive testing
   - Review for best practices, security, performance
   - Consider edge cases and accessibility

6. **DELIVER** - Complete handoff with knowledge transfer
   - Provide complete solution with instructions
   - Document challenges and solutions
   - Suggest improvements and next steps

### Project-Specific Principles

- **Tool Factory Pattern**: All tools follow `createXToolDefinition()` + `createXTool()` — never instantiate tools directly
- **Extension Lifecycle First**: Prefer extension hooks over modifying core agent logic
- **Trust Before Execution**: The trust manager gates project execution on explicit trust decisions
- **Session Immutability**: Session entries are append-only JSONL; never modify past entries

## Implementation Standards

### TypeScript / Node.js Specific

- `strict: true` in tsconfig — never bypass with `@ts-ignore` or `as any` unless absolutely necessary
- Use only **erasable TypeScript syntax** (Node strip-only mode): no parameter properties, no `enum`, no `namespace`/`module`, no `import =`, no `export =`. Use explicit fields with constructor assignments.
- Never use `any` unless absolutely necessary — prefer `unknown`
- **No inline imports** (`await import()`, `import("pkg").Type`). Top-level imports only.
- All imports use `.ts` extensions (e.g. `import { x } from "./x.ts"`). No `.js` imports in `.ts` files.
- Check `node_modules` for external API types — don't guess
- Never remove or downgrade code to fix type errors from outdated deps — upgrade the dep instead

### Module System

- ESM throughout (`"type": "module"` in package.json)
- Path aliases resolve sibling packages to `src/` in vitest, `dist/` in builds
- `tsconfig.build.json` maps `@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`, `@earendil-works/pi-tui` to sibling `dist/` dirs

### Build & Type Checking

- **Compiler**: `tsgo` (`@typescript/native-preview`), not `tsc`
- Type check: `tsgo --noEmit` (part of `npm run check`)
- Build: `tsgo -p tsconfig.build.json` + `chmod +x dist/cli.js` + copy-assets (theme JSON, images, HTML templates)

## Development Workflow

### Environment Setup

```bash
npm ci --ignore-scripts    # Hydrate from lockfile
npm run build              # tui → ai → agent → coding-agent (from repo root)
```

### Build Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | tsgo + chmod + copy-assets |
| `npm run build:binary` | Full Bun binary compilation (6 platforms) |
| `npm run test` | vitest --run |
| `npm run test:harness` | vitest with harness config |
| `npm run shrinkwrap` | Regenerate npm-shrinkwrap.json |
| `npm run check` | biome + ts-imports + shrinkwrap + tsgo + browser-smoke (from root) |

### Running from Source

```bash
# From repo root:
./pi-test.sh              # Uses tsx to run CLI
./pi-test.sh --no-env     # Without API keys
```

### Check Pipeline (exact order)

`npm run check` from repo root runs these sequentially. All must pass:

1. `biome check --write --error-on-warnings .` — lint + format
2. `npm run check:pinned-deps` — verify direct deps are exact versions
3. `npm run check:ts-imports` — no relative `.js` imports in `.ts` files
4. `npm run check:shrinkwrap` — coding-agent shrinkwrap verification
5. `tsgo --noEmit` — type check
6. `npm run check:browser-smoke` — esbuild browser bundle check

## Testing Strategy

### Test Commands

| Command | Purpose |
|---------|---------|
| `npm run test` | Run all tests (vitest --run) |
| `npm run test:harness` | Run with harness config (v8 coverage) |
| `node ../../node_modules/vitest/dist/cli.js --run test/specific.test.ts` | Run single test |

### Test Framework

- **Vitest 3.2.4** with globals enabled, node environment, 30s timeout
- Config: `vitest.config.ts` — aliases resolve `@earendil-works/pi-ai` and `@earendil-works/pi-agent-core` to sibling `src/`
- `@silvia-odwyer/photon-node` excluded from vitest server deps

### Suite Tests (`test/suite/`)

- Use `test/suite/harness.ts` with `FauxProvider` from pi-ai — no real API keys, no paid tokens
- Regression tests: `test/suite/regressions/<issue-number>-<short-slug>.test.ts`

### Critical Warning

**Never run `vitest --run` from the repo root.** It includes e2e tests that activate when endpoint/auth env vars are present. Use `./test.sh` from root instead (unsets API keys, backs up auth.json).

## Code Quality Standards

### Linting & Formatting

```bash
npm run check              # Full pipeline from repo root
biome check --write .      # Lint + format only (from package root)
```

**Biome config** (`biome.json`):
- Indent: tabs
- Line width: 120
- `noExplicitAny: off`, `noNonNullAssertion: off`, `useConst: error`

### Generated Files

- `packages/ai/src/models.generated.ts` — **never edit directly**; update `packages/ai/scripts/generate-models.ts` then regenerate
- `packages/ai/src/image-models.generated.ts` — same rule
- Including the resulting `models.generated.ts` diff alongside your changes is always OK

## Git & Version Control

### Commit Standards

Format: `{feat,fix,docs}[(ai,tui,agent,coding-agent)]: <message>`

- No emojis in commits, issues, PR comments, or code
- Technical prose only, be direct
- Atomic commits (one logical change per commit)

### Lockfile Policy

- Pre-commit blocks lockfile commits unless `PI_ALLOW_LOCKFILE_CHANGE=1`
- Never bypass unless the user wants the lockfile change committed
- `packages/ai/src/models.generated.ts` may always be included alongside your files

### Multi-Session Safety

Multiple pi sessions may run in this cwd simultaneously. Follow these rules:

- Only commit files **you** changed in **this** session
- Stage explicit paths (`git add <path1> <path2>`) — never `git add -A` or `git add .`
- Before committing, run `git status` and verify you are only staging your files
- Never run `git reset --hard`, `git checkout .`, `git clean -fd`, `git stash`, `git add -A`, `git add .`, or `git commit --no-verify`

## Error Handling & Debugging

- **Session retry loop**: `agent-session.ts` implements automatic retry with configurable `RetrySettings`
- **Exec utilities**: `exec.ts` provides `execCommand()` with timeout and abort signal support, returns `{ stdout, stderr, code, killed }`
- **Trust manager**: `trust.json` with file-level lockfile gates project execution on explicit trust decisions
- **Session persistence**: JSONL format v3 with hierarchical entry types — if sessions corrupt, check `~/.pi/agent/sessions/`

## Project-Specific Standards

### Architecture

```
src/
  cli.ts                    — Node entry point
  bun/cli.ts                — Bun binary entry (sandbox restore + Bedrock)
  main.ts                   — CLI arg parsing, mode dispatch, session selection
  index.ts                  — Public SDK barrel exports
  config.ts                 — Package detection, install method, self-update
  migrations.ts             — One-time startup migrations
  core/
    agent-session.ts        — Core session abstraction (state, events, retry, compaction)
    sdk.ts                  — createAgentSession() factory: wires tools, settings, model registry
    session-manager.ts      — JSONL persistence (v3 format)
    settings-manager.ts     — Layered settings (global + project) with lockfile
    resource-loader.ts      — Discovers extensions, skills, prompts, themes
    trust-manager.ts        — Project trust store (trust.json with lockfile)
    skills.ts               — SKILL.md loading with YAML frontmatter validation
    prompt-templates.ts     — /command expansion with bash-style arg substitution
    tools/                  — 7 built-in tools (bash, read, edit, write, grep, find, ls)
    extensions/             — Event-driven extension system with lifecycle hooks
  modes/
    interactive/            — Full TUI with differential rendering, components, themes, assets
    print-mode.ts           — Non-interactive stdout (--print flag)
    rpc/                    — JSON-RPC server for programmatic access
```

### Tools System

7 built-in tools created via factory functions:

| Tool | Factory | Purpose |
|------|---------|---------|
| `bash` | `createBashTool()` | Shell command execution |
| `read` | `createReadTool()` | File reading |
| `edit` | `createEditTool()` | File editing (exact string replacement) |
| `write` | `createWriteTool()` | File writing |
| `grep` | `createGrepTool()` | Content search (ripgrep) |
| `find` | `createFindTool()` | File finding (fd) |
| `ls` | `createLsTool()` | Directory listing |

Tool sets: `createReadOnlyTools()`, `createCodingTools()`, `createAllTools()`, `withFileMutationQueue()`

### Extension System

Event-driven with lifecycle hooks. Extensions discover from:
1. `.pi/extensions/` (project)
2. `~/.pi/agent/extensions/` (global)
3. `builtin/` (package builtins)

Key events: `session_start`, `before_provider_request`, `before_agent_start`, `agent_start`, `message_start`

Extensions can register: custom tools, commands, shortcuts, flags, UI primitives.

See `src/core/extensions/types.ts` for the full event enum and handler signatures.

### Skills System

- Skills are `SKILL.md` files with YAML frontmatter: `name` (lowercase alphanumeric + hyphens, max 64 chars), `description` (max 1024 chars), optional `disable-model-invocation`
- Discovery: recursive scan; SKILL.md in root = skill root (no further recursion)
- Collision detection via real path resolution
- Loaded from: `~/.pi/agent/skills/` (user), `.pi/skills/` (project), explicit paths
- Formatted as XML `<available_skills>` for system prompt injection

### Prompt Templates

- Markdown files with frontmatter: `description`, optional `argument-hint`
- Bash-style arg substitution: `$1`, `$@`, `$ARGUMENTS`, `${@:N}`, `${@:N:L}`
- Loaded from: `~/.pi/agent/prompts/` (global), `.pi/prompts/` (project), explicit paths
- Expansion: `/command args` syntax matched against template names

### Settings System

- **Layered**: global (`~/.pi/agent/agent.json`) → project-local (`.pi/settings.json`)
- Lockfile-based concurrency via `proper-lockfile`
- Settings types: CompactionSettings, BranchSummarySettings, RetrySettings, TerminalSettings, ImageSettings, ThemeSettings, ProviderSettings, etc.

### Session Management

- JSONL-based persistence with hierarchical entry types: message, thinking_level_change, model_change, branch_summary, compaction, compaction_summary, compaction_summarize, custom
- Session header: id, timestamp, cwd, parentSession
- Session version: 3
- Session directories: `~/.pi/agent/sessions/<encoded-cwd>/`

### Migrations

One-time startup migrations in `src/migrations.ts`:
1. `migrateAuthToAuthJson()` — oauth.json + settings.json → auth.json
2. `migrateExplicitEnvVarConfigValues()` — plain env var strings → `$ENV_VAR` syntax
3. `migrateSessionsFromAgentRoot()` — moves sessions to proper directories
4. `migrateToolsToBin()` — fd/rg binaries from tools/ → bin/
5. `migrateKeybindingsConfigFile()` — keybindings config migration
6. `migrateExtensionSystem()` — commands/ → prompts/, deprecated hooks/tools dirs

### Resource Loading

`DefaultResourceLoader` discovers in order:
1. Project `.pi/extensions/`, `.pi/skills/`, `.pi/prompts/`
2. Global `~/.pi/agent/extensions/`, `~/.pi/agent/skills/`, `~/.pi/agent/prompts/`
3. Builtin resources from `builtin/`

## Environment Variables

### Runtime Config

| Variable | Purpose |
|----------|---------|
| `PI_CODING_AGENT` | Set to `true` by cli.ts |
| `PI_CODING_AGENT_DIR` | Override agent config directory |
| `PI_CODING_AGENT_SESSION_DIR` | Override session directory |
| `PI_PACKAGE_DIR` | Override package directory (Nix/Guix) |
| `PI_OFFLINE` | Offline mode |
| `PI_SKIP_VERSION_CHECK` | Skip version check |
| `PI_NO_LOCAL_LLM` | Skip local LLM tests (set by test.sh) |
| `PI_ALLOW_LOCKFILE_CHANGE` | Allow lockfile commits (set to `1`) |
| `PI_SHARE_VIEWER_URL` | Override share viewer URL |

### Provider API Keys

`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`, `AWS_PROFILE`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `GOOGLE_APPLICATION_CREDENTIALS`, and 20+ more. See `packages/ai/src/env-api-keys.ts` for the full list.

## Anti-Patterns to Avoid

- **Inline imports** — use top-level imports only; no `await import()` or `import("pkg").Type`
- **Editing generated files** — never modify `models.generated.ts` directly; update the generator script
- **Running `vitest --run` from root** — it activates e2e tests with real API keys; use `./test.sh` instead
- **Using `any`** — prefer `unknown`; check `node_modules` for external API types
- **Hardcoded key checks** — add defaults to `DEFAULT_EDITOR_KEYBINDINGS` or `DEFAULT_APP_KEYBINDINGS` so they stay configurable
- **Removing code for type errors** — upgrade the dep instead of downgrading code
- **`git add -A` / `git add .`** — always stage explicit paths to avoid stomping other sessions' work
- **Bypassing lockfile checks** — never commit lockfile changes without `PI_ALLOW_LOCKFILE_CHANGE=1`

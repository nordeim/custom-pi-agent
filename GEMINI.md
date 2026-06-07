# coding-agent

Pi is an elite, minimal terminal coding harness and interactive agent CLI. It is built to be highly extensible through TypeScript Extensions, Skills, Prompt Templates, and Themes, allowing users to adapt it to their specific workflows.

## Foundational Principles

### Meticulous Approach (Six-Phase Workflow)
All implementation tasks MUST follow this six-phase workflow:
1.  **ANALYZE:** Deep, multi-dimensional requirement mining. Never make surface-level assumptions.
2.  **PLAN:** Structured execution roadmap with sequential phases. Present for confirmation.
3.  **VALIDATE:** Obtain explicit user approval before implementation.
4.  **IMPLEMENT:** Modular, tested, and documented builds.
5.  **VERIFY:** Rigorous QA against success criteria, including edge cases and accessibility.
6.  **DELIVER:** Complete handoff with knowledge transfer and future recommendations.

### Core Standards
-   **Tool Factory Pattern:** Tools are created via `createXToolDefinition()` and `createXTool()` — never instantiate tools directly.
-   **Extension Lifecycle:** Prefer extension hooks over modifying core agent logic.
-   **Trust Manager:** Project execution is gated by explicit trust decisions (`trust.json`).
-   **Session Immutability:** Sessions are append-only JSONL; never modify past entries.
-   **Anti-Generic Design:** Reject template aesthetics and "AI slop." Strive for bespoke layouts, distinctive typography, and intentional minimalism.

## Tech Stack & Conventions
-   **Runtime:** Node.js 22.19.0+ (ESM throughout).
-   **Language:** TypeScript (Strict Mode).
-   **Compiler:** `tsgo` (`@typescript/native-preview`).
-   **Linting/Formatting:** Biome 2.3.5.
-   **Testing:** Vitest 3.2.4.
-   **TypeScript Specifics:**
    -   Use only **erasable TypeScript syntax** (no parameter properties, no `enum`, no `namespace`).
    -   All imports must use `.ts` extensions.
    -   Top-level imports only (no `await import()`).
    -   Never use `any` unless absolutely necessary; prefer `unknown`.

## Architecture Overview
-   `src/cli.ts`: Node entry point.
-   `src/main.ts`: CLI argument parsing, mode dispatch, and session selection.
-   `src/core/agent-session.ts`: Core session abstraction (state, events, retry, compaction).
-   `src/core/sdk.ts`: `createAgentSession()` factory that wires tools, settings, and models.
-   `src/core/session-manager.ts`: JSONL persistence (v3 format).
-   `src/core/settings-manager.ts`: Layered settings (global + project) with lockfile.
-   `src/modes/`: Implements `interactive`, `print`, and `rpc` modes.
-   `src/core/tools/`: 7 built-in tools (`bash`, `read`, `edit`, `write`, `grep`, `find`, `ls`).

## Development Workflow

### Building & Running
```bash
npm run build              # Standard build (tsgo + assets)
npm run build:binary       # Full Bun binary compilation
./pi-test.sh               # Run coding-agent from source via tsx (from repo root)
```

### Testing & Quality Assurance
```bash
npm run test               # Run all tests (vitest --run)
npm run test:harness       # Run tests with harness config (v8 coverage)
npm run check              # Full pipeline (Biome, shrinkwrap, tsgo --noEmit, etc.)
biome check --write .      # Lint and format only
```

### Critical Testing Warning
**Never run `vitest --run` from the repo root.** It includes e2e tests that activate when endpoint/auth env vars are present. Use `./test.sh` from the root instead.

## Git & Commit Standards
-   **Format:** `{feat,fix,docs}[(ai,tui,agent,coding-agent)]: <message>`
-   **Atomic Commits:** One logical change per commit.
-   **Technical Prose Only:** No emojis; be direct and concise.
-   **Staging:** Always stage explicit paths (`git add <file>`). Never use `git add .` or `git add -A` to avoid stomping on other active sessions.

## Project Resources
-   **Context Files:** `AGENTS.md` and `CLAUDE.md` provide project-specific instructions and conventions.
-   **Settings:** Global (`~/.pi/agent/settings.json`) and Project (`.pi/settings.json`).
-   **Extensions/Skills/Prompts:** Located in `~/.pi/agent/` or `.pi/` subdirectories.

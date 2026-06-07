Analysis: Current README Gaps  
  
┌───────────────────────┬──────────────────────────────┬────────────────────────────────────────────────────┐  
│ Dimension             │ Current State                │ Target State                                       │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Tagline               │ None after logo              │ One-line "Minimal terminal coding harness"         │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Quick Overview        │ Absent                       │ 3-5 sentence problem/solution statement            │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Quick Start           │ Not present (only dev setup) │ Copy-paste install + authenticate + first prompt   │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Architecture          │ Missing                      │ Tech stack table + monorepo dependency diagram     │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ File Hierarchy        │ Missing                      │ Annotated tree of 4 packages + key dirs            │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ CLI Tool Catalog      │ Implicit                     │ Mode table, tool list, CLI reference               │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Environment Variables │ Missing                      │ Grouped table of key env vars                      │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Testing               │ Scattered in dev section     │ Dedicated section with exact commands              │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Design Philosophy     │ Absent                       │ Why minimal core? Why no MCP/sub-agents/plan mode? │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ What's New            │ Missing                      │ Recent changelog highlights                        │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Badges                │ Discord only                 │ Add npm version, CI status, license, Bun platforms │  
├───────────────────────┼──────────────────────────────┼────────────────────────────────────────────────────┤  
│ Supply Chain          │ Buried in prose              │ Compact hardening table                            │  
└───────────────────────┴──────────────────────────────┴────────────────────────────────────────────────────┘  
  
────────────────────────────────────────────────────────────────────────────────  
  
Plan: Replacement README.md  
  
### Proposed Structure  
  
1. Title + Badges  
    - Pi logo + name  
    - Badges: npm version, CI status, license, Bun binaries (darwin/linux/windows), Discord  
    - Tagline: "Minimal terminal coding harness. Adapt pi to your workflows, not the other way around."  
2. Overview (3-5 sentences)  
    - What: Pi is an interactive coding agent CLI that runs in your terminal  
    - Why: Most coding agents dictate your workflow; pi stays minimal and lets you customize via Extensions, Skills, Prompt Templates, and Themes  
    - How: pi gives models 4 built-in tools (read, write, edit, bash), supports 30+ LLM providers, and runs in 4 modes (interactive TUI, print, JSON events, RPC)  
3. Key Features (table)  
   ┌───────────────────────┬───────────────────────────────────────────────────────────────────┐  
   │ Feature               │ Description                                                       │  
   ├───────────────────────┼───────────────────────────────────────────────────────────────────┤  
   │ Extensible Core       │ Extensions, Skills, Prompt Templates, Themes, Pi Packages         │  
   ├───────────────────────┼───────────────────────────────────────────────────────────────────┤  
   │ 30+ LLM Providers     │ Anthropic, OpenAI, Google, Bedrock, Mistral, GitHub Copilot, etc. │  
   ├───────────────────────┼───────────────────────────────────────────────────────────────────┤  
   │ 4 Run Modes           │ Interactive TUI, Print, JSON event stream, RPC                    │  
   ├───────────────────────┼───────────────────────────────────────────────────────────────────┤  
   │ Session Management    │ Branching, forking, cloning, compaction, tree navigation          │  
   ├───────────────────────┼───────────────────────────────────────────────────────────────────┤  
   │ Anti-Generic TUI      │ Differential rendering, synchronized output, inline images        │  
   ├───────────────────────┼───────────────────────────────────────────────────────────────────┤  
   │ Supply Chain Hardened │ Pinned deps, no lifecycle scripts, lockfile gating                │  
   └───────────────────────┴───────────────────────────────────────────────────────────────────┘  
4. Quick Start (numbered, copy-pasteable)  
    - Install: npm install -g --ignore-scripts @earendil-works/pi-coding-agent  
    - Verify: pi --version  
    - Authenticate: export ANTHROPIC_API_KEY=sk-ant-... then pi  
    - First prompt: "Summarize this repository"  
    - Alternative: curl installer, bun binary downloads  
5. Architecture  
    - Tech stack table: Layer, Technology, Version, Purpose  
    - Monorepo dependency diagram (mermaid flowchart, 4 packages + arrows)  
    - Build order: tui -> ai -> agent -> coding-agent  
    - Compiler: tsgo, Linter: Biome 2.3.5, Test: Vitest 3.2.4  
6. Package Hierarchy (annotated tree)  
    - packages/tui/ — Terminal UI with differential rendering  
    - packages/ai/ — Unified multi-provider LLM API  
    - packages/agent/ — Agent runtime with tool execution and event streaming  
    - packages/coding-agent/ — Interactive coding agent CLI (main product)  
7. Quick Tour of Interactive Mode  
    - Editor, slash commands, keyboard shortcuts, message queue  
    - Sessions, branching with /tree, compaction  
    - /model, /settings, /trust, /export, /share  
8. Customization (compact table)  
   ┌──────────────────┬─────────────────┬──────────────────────────────────────────┐  
   │ System           │ Where           │ Format                                   │  
   ├──────────────────┼─────────────────┼──────────────────────────────────────────┤  
   │ Extensions       │ .pi/extensions/ │ TypeScript, event-driven lifecycle hooks │  
   ├──────────────────┼─────────────────┼──────────────────────────────────────────┤  
   │ Skills           │ .pi/skills/     │ SKILL.md + YAML frontmatter              │  
   ├──────────────────┼─────────────────┼──────────────────────────────────────────┤  
   │ Prompt Templates │ .pi/prompts/    │ Markdown + bash-style args               │  
   ├──────────────────┼─────────────────┼──────────────────────────────────────────┤  
   │ Themes           │ .pi/themes/     │ JSON (hot-reloadable)                    │  
   ├──────────────────┼─────────────────┼──────────────────────────────────────────┤  
   │ Pi Packages      │ npm/git         │ Bundles multiple of the above            │  
   └──────────────────┴─────────────────┴──────────────────────────────────────────┘  
9. CLI Reference (compact command table)  
    - Modes: default, -p, --mode json, --mode rpc  
    - Model options: --provider, --model, --thinking, --list-models  
    - Session options: -c, -r, --session, --fork, --name  
    - Tool options: --tools, --exclude-tools, --no-tools  
    - Resource options: -e, --no-extensions, --skill, --no-skills  
    - Package commands: pi install, pi remove, pi list, pi update, pi config  
10. Environment Variables (grouped table)  
- Runtime: PI_CODING_AGENT_DIR, PI_OFFLINE, PI_SKIP_VERSION_CHECK, PI_TELEMETRY  
- Provider keys: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, etc.  
  
11. Testing (exact commands)  
- ./test.sh — non-LLM tests (no API keys)  
- npm test — full test suite  
- npm run check — lint + typecheck + shrinkwrap + browser smoke  
- CI pipeline structure  
  
12. Contributing  
- Link to CONTRIBUTING.md  
- Quality bar, lgtm gate, npm run check && ./test.sh before PR  
- Monorepo workspace conventions  
  
13. Supply Chain Hardening  
- Compact table: practice, how pi enforces it  
- Pinned direct deps, --ignore-scripts, pre-commit lockfile gate, shrinkwrap, scheduled npm audit  
  
14. Philosophy (short)  
- Minimal core, extension-first, no MCP, no sub-agents, no permission popups, no plan mode, no built-in to-dos, no background bash  
- Link to blog post for rationale  
  
15. What's New (from CHANGELOG)  
- Last 1-2 releases: project trust gating, named startup sessions, exclude-tools, more providers  
  
16. License — MIT  
  
### Sections to exclude (per skill guidelines)  
  
- No "Design System" — pi doesn't have a design token system beyond themes  
- No "Deployment" — the project is a CLI tool, not a production service  
- No "Project Status" — the project is mature, no phase-based implementation  
- No "Troubleshooting" — would duplicate documented issues from docs/; keep this short or link to docs  
- No "Local Context" — no regional compliance requirements  
  
### Quality checks to verify before finalizing  
  
- [ ] Every command is copy-pasteable and tested  
- [ ] Badge links are correct (npm, CI from .github/workflows/ci.yml, license)  
- [ ] Tech stack versions match package.json and lockfiles  
- [ ] Tree reflects actual directory structure  
- [ ] Mermaid diagram renders correctly  
- [ ] No placeholder or speculative content  
- [ ] License matches LICENSE file  
- [ ] All docs/ links point to real files  
- [ ] Sections are proportional to project complexity (not padded)


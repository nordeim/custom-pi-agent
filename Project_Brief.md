Project: Pi Agent Harness Monorepo  
  
### WHAT: The Project Overview  
  
Pi is an elite, minimal, extensible terminal coding agent harness -- the main product being an interactive coding agent CLI. It is designed to let users adapt it to their workflows rather than forcing a prescribed flow. The monorepo   
lives at /home/project/pi-agent and contains four npm workspace packages (build order: tui -> ai -> agent -> coding-agent):  
  
┌───────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────┐ 
│ Package                               │ Key Role                                                                                                                                    │ Key Files                                        │ 
├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ packages/tui (@earendil-works/pi-tui) │ Terminal UI framework with differential rendering, synchronized output (CSI 2026), component system (Text, Editor, Markdown, Loader,        │ tui.ts, terminal.ts, keys.ts, editor.ts,         │ 
│                                       │ SelectList, SettingsList, Image, Box, Container), overlays, autocomplete, and Kitty/iTerm2 inline image support. Zero-fluff minimal         │ markdown.ts                                      │ 
│                                       │ rendering.                                                                                                                                  │                                                  │ 
├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ packages/ai (@earendil-works/pi-ai)   │ Unified multi-provider LLM API with 30+ providers (Anthropic, OpenAI, Google, Bedrock, Mistral, Groq, etc.), model discovery/registry,      │ types.ts, stream.ts, models.ts, api-registry.ts, │ 
│                                       │ streaming event protocol (text_delta, thinking_delta, toolcall_delta, etc.), OAuth flows, image generation, thinking/reasoning support,     │ providers/*.ts                                   │ 
│                                       │ cross-provider handoffs, cost tracking, TypeBox-based tool validation, and a Faux provider for testing.                                     │                                                  │ 
├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ packages/agent                        │ Stateful agent runtime with tool execution (parallel/sequential), event streaming, steering/follow-up message queues, session compaction,   │ agent.ts, agent-loop.ts, types.ts,               │ 
│ (@earendil-works/pi-agent-core)       │ error recovery, custom message types via declaration merging, and low-level agentLoop()/agentLoopContinue() APIs.                           │ harness/compaction/*.ts                          │ 
├───────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────┤ 
│ packages/coding-agent                 │ The main product: interactive coding agent CLI. Four runtime modes (interactive TUI, print, JSON, RPC), 7 built-in tools (read, bash, edit, │ main.ts, cli.ts, core/sdk.ts,                    │ 
│ (@earendil-works/pi-coding-agent)     │ write, grep, find, ls) via factory pattern, extension system (event-driven lifecycle hooks), skills system (SKILL.md with YAML              │ core/agent-session.ts, core/extensions/types.ts, │ 
│                                       │ frontmatter), prompt templates (bash-style substitution), layered settings (global + project), session management (JSONL v3, branching,     │ core/tools/*.ts, modes/interactive/*.ts          │ 
│                                       │ compaction), trust manager, migrations, theme system, SDK exports.                                                                          │                                                  │ 
└───────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────┘ 
  
────────────────────────────────────────────────────────────────────────────────  
  
### WHY: The Design Philosophy and Architectural Drivers  
  
1. Minimal Core, Extensible Everything: The project explicitly states "Adapt pi to your workflows, not the other way around." Features like sub-agents, plan mode, MCP, permission popups, and to-do tracking are intentionally excluded   
   from the core. Instead, users build them via Extensions (TypeScript modules with lifecycle hooks), Skills (SKILL.md files), Prompt Templates (markdown with arg substitution), and Themes (hot-reloadable JSON). This keeps the core    
   small while allowing infinite customization.  
2. Anti-Generic Rejection of "AI Slop": The CLAUDE.md and GEMINI.md inside coding-agent explicitly reject template aesthetics and safe defaults. Every component, event, and API is intentionally minimal and precise -- no purple  
   gradients, no rounded-card-with-left-border patterns, no Inter/Roboto safety.  
3. Tool Factory Pattern: All 7 built-in tools follow createXToolDefinition() + createXTool(). Tools are never instantiated directly. This enables clean separation between definition (schema, description) and implementation (execute    
   logic), and allows both built-in and extension tools to coexist.  
4. Session Immutability: Sessions are stored as append-only JSONL (format v3). Entries are never modified after writing. This enables branching, forking, cloning, tree navigation, and safe crash recovery.  
5. Security Model: The project explicitly documents its trust model. Pi runs with the user's permissions -- no built-in sandbox. Containerization docs (docs/containerization.md) provide three isolation patterns (OpenShell, Gondolin,   
   Docker). The trust manager gates project-local resources behind explicit user decisions.  
6. Supply Chain Hardening: Dependencies are treated as reviewed code. Lockfiles are pinned, lifecycle scripts are blocked (--ignore-scripts), and pre-commit hooks block lockfile changes unless explicitly allowed  
   (PI_ALLOW_LOCKFILE_CHANGE=1).  
  
────────────────────────────────────────────────────────────────────────────────  
  
### HOW: Architecture and Key Mechanisms  
  
Entry Point Flow:  
- src/cli.ts (Node) or src/bun/cli.ts (Bun binary) -> both call main() in src/main.ts  
- main.ts parses CLI args, resolves sessions, builds settings, runs migrations, then dispatches to one of three modes  
- createAgentSession() in core/sdk.ts is the main factory: wires auth, model registry, settings, tools, and the extension runner  
  
Agent Loop (the heart):  
- Agent class (packages/agent/src/agent.ts) wraps the low-level agentLoop() / agentLoopContinue() functions  
- The loop: user message -> LLM response (streamed via AssistantMessageEventStream) -> tool calls (sequential or parallel) -> tool results -> check steering/follow-up queues -> loop or stop  
- Events flow through AgentEvent types: agent_start, turn_start, message_start/update/end, tool_execution_start/update/end, turn_end, agent_end  
- AgentMessage is a union type extendable via declaration merging  
  
Tool System:  
- Built-in tools: read, bash, edit, write, grep, find, ls  
- Each has a ToolDefinition (schema via TypeBox) + Tool (AgentTool runtime)  
- Three tool sets: createCodingTools() (read, bash, edit, write), createReadOnlyTools() (read, grep, find, ls), createAllTools()  
- Tool execution modes: parallel (default, preflight sequentially then execute concurrently) vs sequential  
  
Extension System:  
- Extensions are TypeScript modules with a default export factory function: (pi: ExtensionAPI) => void | Promise<void>  
- Events: session_start, session_before_switch, context, before_provider_request, after_provider_response, before_agent_start, agent_start/end, turn_start/end, message_start/update/end, tool_execution_*, tool_call/result,  
  model_select, thinking_level_select, input, user_bash, resources_discover, session tree/compact events  
- Extensions can register tools, commands, keyboard shortcuts, CLI flags, custom message renderers, provider overrides, and UI widgets  
- Extension API provides ui context: select(), confirm(), input(), notify(), setStatus(), setWidget(), setFooter(), setHeader(), custom() for dialogs, editor() for multi-line editing  
- Extensions discovered from .pi/extensions/ (project), ~/.pi/agent/extensions/ (global), and built-in  
  
Skills System:  
- SKILL.md files with YAML frontmatter: name, description, disable-model-invocation  
- Discovered from ~/.pi/agent/skills/, .pi/skills/, ~/.agents/skills/ (walking up from cwd)  
- Invoked via /skill:name or auto-loaded by the model  
  
Settings:  
- Layered: global (~/.pi/agent/agent.json) overridden by project-local (.pi/settings.json)  
- Settings types: Compaction, BranchSummary, Retry, Terminal, Image, Theme, Provider, Steering, FollowUp, Transport, etc.  
- Lockfile-based concurrency via proper-lockfile  
  
Session Management:  
- JSONL format v3 with hierarchical entry types: session (header), message, thinking_level_change, model_change, branch_summary, compaction, compaction_summary, compaction_summarize, custom  
- Each entry has id, parentId, timestamp for tree structure  
- Branching via /tree (in-place navigation), /fork (new session from user message), /clone (duplicate active branch)  
- Compaction is lossy summarization of older messages; full history remains in JSONL for tree navigation  
  
Key Architectural Principles from AGENTS.md and CLAUDE.md:  
- Erasable TypeScript only: no enum, namespace, parameter properties, import =, export = -- these need JS emit which tsgo strip-only mode cannot handle  
- No inline imports (await import(), import("pkg").Type) -- top-level imports only  
- .ts extensions on all imports: no .js imports in .ts files  
- Compiler: tsgo (@typescript/native-preview) not tsc  
- Biome 2.3.5 for linting/formatting (tabs, 120 line width)  
- ESM everywhere ("type": "module")  
- Vitest 3.2.4 testing with FauxProvider (no real API keys in tests)  
- Never run vitest --run from root: activates e2e tests; use ./test.sh instead  
  
────────────────────────────────────────────────────────────────────────────────  
  
### Key File Paths Summary  
  
Root Documentation:  
- /home/project/pi-agent/AGENTS.md -- Development rules for agents and humans (architecture, code quality, git, releasing)  
- /home/project/pi-agent/README.md -- Project overview, packages, development setup, supply-chain hardening  
- /home/project/pi-agent/CONTRIBUTING.md -- Contribution gate, quality bar, blocking rules  
- /home/project/pi-agent/SECURITY.md -- Security model, reporting policy, out-of-scope items  
  
Package Documentation:  
- /home/project/pi-agent/packages/coding-agent/AGENTS.md -- coding-agent-specific architecture, commands, testing, conventions  
- /home/project/pi-agent/packages/coding-agent/CLAUDE.md -- Meticulous Approach six-phase workflow, implementation standards, project-specific principles (Tool Factory, Extension Lifecycle, Trust Before Execution, Session  
  Immutability)  
- /home/project/pi-agent/packages/coding-agent/GEMINI.md -- Condensed coding-agent docs: Meticulous Approach, core standards, anti-generic design, architecture overview  
- /home/project/pi-agent/packages/coding-agent/README.md -- Full user-facing README with CLI reference, customization docs, philosophy  
  
Core Source Files:  
- /home/project/pi-agent/packages/coding-agent/src/main.ts -- CLI orchestration, arg parsing, mode dispatch, session selection, trust prompts  
- /home/project/pi-agent/packages/coding-agent/src/core/sdk.ts -- createAgentSession() factory  
- /home/project/pi-agent/packages/coding-agent/src/core/agent-session.ts -- Core session abstraction  
- /home/project/pi-agent/packages/coding-agent/src/core/extensions/types.ts -- Complete extension event types, API, tool definitions  
- /home/project/pi-agent/packages/agent/src/agent-loop.ts -- Low-level agent loop (the runtime engine)  
- /home/project/pi-agent/packages/agent/src/agent.ts -- Stateful Agent class with queue management  
- /home/project/pi-agent/packages/agent/src/types.ts -- Core types: AgentMessage, AgentEvent, AgentTool, AgentContext, AgentLoopConfig  
- /home/project/pi-agent/packages/ai/src/types.ts -- LLM types: Message, Model, Tool, Context, AssistantMessageEvent, StreamOptions  
- /home/project/pi-agent/packages/tui/src/tui.ts -- TUI class with differential rendering, overlays, focus management  
- /home/project/pi-agent/packages/tui/src/index.ts -- All TUI exports 


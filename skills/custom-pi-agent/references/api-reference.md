# Pi Extension API Reference

All interfaces from `packages/coding-agent/src/core/extensions/types.ts` unless noted.

## ExtensionAPI (`types.ts:1092-1255`)

Main API object passed to extension factory functions.

### Event Subscription

```
on(event: string, handler: ExtensionHandler<E, R>): void
```

Key event names with types:
- `"resources_discover"` → `ResourcesDiscoverEvent`, returns `ResourcesDiscoverResult`
- `"session_start"` → `SessionStartEvent`
- `"session_before_switch"` → `SessionBeforeSwitchEvent`, returns `SessionBeforeSwitchResult`
- `"session_before_fork"` → `SessionBeforeForkEvent`, returns `SessionBeforeForkResult`
- `"session_before_compact"` → `SessionBeforeCompactEvent`, returns `SessionBeforeCompactResult`
- `"session_compact"` → `SessionCompactEvent`
- `"session_shutdown"` → `SessionShutdownEvent`
- `"session_before_tree"` → `SessionBeforeTreeEvent`, returns `SessionBeforeTreeResult`
- `"session_tree"` → `SessionTreeEvent`
- `"context"` → `ContextEvent`, returns `ContextEventResult`
- `"before_provider_request"` → `BeforeProviderRequestEvent`, returns `BeforeProviderRequestEventResult`
- `"after_provider_response"` → `AfterProviderResponseEvent`
- `"before_agent_start"` → `BeforeAgentStartEvent`, returns `BeforeAgentStartEventResult`
- `"agent_start"` → `AgentStartEvent`
- `"agent_end"` → `AgentEndEvent`
- `"turn_start"` → `TurnStartEvent`
- `"turn_end"` → `TurnEndEvent`
- `"message_start"` → `MessageStartEvent`
- `"message_update"` → `MessageUpdateEvent`
- `"message_end"` → `MessageEndEvent`, returns `MessageEndEventResult`
- `"tool_execution_start"` → `ToolExecutionStartEvent`
- `"tool_execution_update"` → `ToolExecutionUpdateEvent`
- `"tool_execution_end"` → `ToolExecutionEndEvent`
- `"model_select"` → `ModelSelectEvent`
- `"thinking_level_select"` → `ThinkingLevelSelectEvent`
- `"tool_call"` → `ToolCallEvent`, returns `ToolCallEventResult`
- `"tool_result"` → `ToolResultEvent`, returns `ToolResultEventResult`
- `"user_bash"` → `UserBashEvent`, returns `UserBashEventResult`
- `"input"` → `InputEvent`, returns `InputEventResult`

### ExtensionHandler

```
types.ts:1088
type ExtensionHandler<E, R = undefined> = (event: E, ctx: ExtensionContext) => Promise<R | void> | R | void;
```

First param is the event (carries domain-specific data). Second param is always `ExtensionContext`.

### Tool Registration

```
types.ts:1142
registerTool(tool: ToolDefinition<TParams, TDetails, TState>): void
```

ToolDefinition (`types.ts:431-480`):
- `name: string` — Tool name for LLM tool calls
- `label: string` — Human-readable UI label (required)
- `description: string` — LLM-facing description
- `parameters: TSchema` — TypeBox schema
- `promptSnippet?: string` — One-line for default system prompt
- `promptGuidelines?: string[]` — Guideline bullets for system prompt
- `renderShell?: "default" | "self"`
- `prepareArguments?: (args: unknown) => Static<TParams>`
- `executionMode?: ToolExecutionMode` — "sequential" | "parallel"
- `execute(toolCallId, params, signal, onUpdate, ctx): Promise<AgentToolResult<TDetails>>`
- `renderCall?: (args, theme, context) => Component` (`types.ts:471`)
- `renderResult?: (result, options, theme, context) => Component` (`types.ts:474-479`)

### Command Registration

```
types.ts:1148
registerCommand(name: string, options: Omit<RegisteredCommand, "name" | "sourceInfo">): void
```

`RegisteredCommand.handler`: `(args: string, ctx: ExtensionCommandContext) => Promise<void>` (`types.ts:1075`). Returns void — use `ctx.ui.notify()` for user feedback.

### Miscellaneous Registration

```
registerShortcut(shortcut: KeyId, options: { description?: string; handler: (ctx: ExtensionContext) => Promise<void> | void }): void
registerFlag(name: string, options: { description?: string; type: "boolean" | "string"; default?: boolean | string }): void
getFlag(name: string): boolean | string | undefined
registerMessageRenderer<T>(customType: string, renderer: MessageRenderer<T>): void
```

### Actions and Session

```
sendMessage(message, options?): void
sendUserMessage(content, options?): void
appendEntry<T>(customType: string, data?: T): void
setSessionName(name: string): void
getSessionName(): string | undefined
setLabel(entryId: string, label: string | undefined): void
exec(command: string, args: string[], options?: ExecOptions): Promise<ExecResult>
getActiveTools(): string[]
getAllTools(): ToolInfo[]
setActiveTools(toolNames: string[]): void
getCommands(): SlashCommandInfo[]
setModel(model: Model<any>): Promise<boolean>
getThinkingLevel(): ThinkingLevel
setThinkingLevel(level: ThinkingLevel): void
registerProvider(name: string, config: ProviderConfig): void
registerModel(model: Model<any>): void
```

### Provider Registration

`registerProvider()` accepts `ProviderConfig` with:
- `baseUrl: string` — API endpoint
- `api: ProviderApi` — `"openai-chat"` | `"anthropic-messages"` | `"google-gemini"` | `"openai-codex"`
- `models: ModelRegistration[]` — model definitions

## ExtensionContext (`types.ts:300-331`)

```
interface ExtensionContext {
  ui: ExtensionUIContext       // notify(), onTerminalInput(), setStatus(), setWorkingMessage(), setWorkingVisible()
  mode: ExtensionMode          // "tui" | "print" | "json" | "rpc"
  hasUI: boolean
  cwd: string
  sessionManager: ReadonlySessionManager
  modelRegistry: ModelRegistry
  model: Model<any> | undefined
  isIdle(): boolean
  signal: AbortSignal | undefined
  abort(): void
  hasPendingMessages(): boolean
  shutdown(): void
  getContextUsage(): ContextUsage | undefined
  compact(options?: CompactOptions): void
  getSystemPrompt(): string
}
```

`ExtensionUIContext.notify(message: string, type?: "info" | "warning" | "error"): void` (`types.ts:135`)

## ExtensionCommandContext (`types.ts:329-357`)

Extends ExtensionContext with session-control methods:

```
getSystemPromptOptions(): BuildSystemPromptOptions
waitForIdle(): Promise<void>
newSession(options?): Promise<{ cancelled: boolean }>
fork(entryId, options?): Promise<{ cancelled: boolean }>
navigateTree(targetId, options?): Promise<{ cancelled: boolean }>
switchSession(sessionPath, options?): Promise<{ cancelled: boolean }>
reload(): Promise<void>
```

## ContextEvent (`types.ts:612-615`)

```
interface ContextEvent {
  type: "context";
  messages: AgentMessage[];   // Can modify in place
}
```

Fired before every LLM call. Mutate `event.messages` to inject system messages or modify conversation. `ContextEventResult` has `messages?: AgentMessage[]` if returning a new array.

## SessionBeforeCompactEvent (`types.ts:543-549`)

```
interface SessionBeforeCompactEvent {
  type: "session_before_compact";
  preparation: CompactionPreparation;
  branchEntries: SessionEntry[];
  customInstructions?: string;
  signal: AbortSignal;
}
```

`SessionBeforeCompactResult` (`types.ts:989-992`): `{ cancel?: boolean; compaction?: CompactionResult }`

No `injectSystemPrompt()` or `systemPrompt` field exists on this event.

## AgentToolResult<T> (`packages/agent/src/types.ts:345-355`)

```
interface AgentToolResult<T> {
  content: (TextContent | ImageContent)[];
  details: T;
  terminate?: boolean;
}
```

`TextContent`: `{ type: "text"; text: string }`
`ImageContent`: `{ type: "image"; source: { type: "base64"; media_type: string; data: string } }`

## Session JSONL Format (`session-manager.ts:46-78`)

SessionEntryBase:
```
{ type: string; id: string; parentId: string | null; timestamp: string }
```

Message entry adds: `message: AgentMessage` (pi-ai type with `role`, `content`).
Compaction entry adds: `summary: string`, `firstKeptEntryId: string`, `tokensBefore: number`, `details?`, `fromHook?`.
Thinking-level change entry adds: `thinkingLevel: string`.
Model change entry adds: `provider: string`, `modelId: string`.
Branch summary entry adds: `fromId: string`, `summary: string`.

## Theme Schema (`theme-schema.json:37-88`)

50 required color tokens:

`accent`, `border`, `borderAccent`, `borderMuted`, `success`, `error`, `warning`, `muted`, `dim`, `text`, `thinkingText`, `selectedBg`, `userMessageBg`, `userMessageText`, `customMessageBg`, `customMessageText`, `customMessageLabel`, `toolPendingBg`, `toolSuccessBg`, `toolErrorBg`, `toolTitle`, `toolOutput`, `mdHeading`, `mdLink`, `mdLinkUrl`, `mdCode`, `mdCodeBlock`, `mdCodeBlockBorder`, `mdQuote`, `mdQuoteBorder`, `mdHr`, `mdListBullet`, `toolDiffAdded`, `toolDiffRemoved`, `toolDiffContext`, `syntaxComment`, `syntaxKeyword`, `syntaxFunction`, `syntaxVariable`, `syntaxString`, `syntaxNumber`, `syntaxType`, `syntaxOperator`, `syntaxPunctuation`, `thinkingOff`, `thinkingMinimal`, `thinkingLow`, `thinkingMedium`, `thinkingHigh`, `thinkingXhigh`, `bashMode`

Color values: hex string `#RRGGBB`, integer 0-255, empty string (terminal default), or `$variable` reference.

## Dependency Check

- `typebox` at `package.json:57` (not `@sinclair/typebox`). Import: `import { Type } from "typebox"`.
- ts-morph for AST parsing (third-party, not a pi dep).
- Pi peer deps: `@earendil-works/pi-coding-agent` (provides all APIs), `@earendil-works/pi-agent-core` (provides AgentToolResult, AgentMessage), `@earendil-works/pi-tui` (provides Component, Text, Box for renderCall/renderResult).

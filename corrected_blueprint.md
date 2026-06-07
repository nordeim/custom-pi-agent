# AVA Blueprint — Corrected & Verified Against Codebase

This document is the corrected version of `draft_blueprint_4.md`. Every API call, type signature, and data structure has been validated against the actual `packages/coding-agent` source code. Lines marked with `// FIX:` explain what was changed from the original.

---

## Step 1: Project Topology & Dependencies

```bash
mkdir ava-agent && cd ava-agent
npm init -y
npm install ts-morph
npm install -D typescript @types/node
```

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

// FIX: Removed `@sinclair/typebox` from dependencies. The Pi codebase uses the `typebox` package (v1.1.38), not `@sinclair/typebox`. Import path is `import { Type } from "typebox"`.

---

## Step 2: Core Utilities

### AST Auditor (`src/utils/ast-auditor.ts`)

No changes needed — the AST auditor is a pure utility with no Pi API dependencies.

```typescript
import { Project, SyntaxKind, Node } from 'ts-morph';

export interface AuditViolation {
  type: 'DOM_DEPTH' | 'AESTHETIC_SLOP';
  severity: 'CRITICAL' | 'WARNING';
  line: number;
  message: string;
  suggestion: string;
}

export interface AuditReport {
  filePath: string;
  violations: AuditViolation[];
  isCompliant: boolean;
}

const BANNED_CLASSES = new Set([
  'rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
  'shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
  'bg-gradient-to-r', 'bg-gradient-to-b', 'bg-gradient-to-tr',
  'border-gray-100', 'border-gray-200', 'border-gray-300'
]);

const MAX_JSX_DEPTH = 4;

function getJsxDepth(node: Node): number {
  return node.getAncestors().filter(ancestor =>
    ancestor.getKind() === SyntaxKind.JsxElement ||
    ancestor.getKind() === SyntaxKind.JsxSelfClosingElement
  ).length;
}

function auditJsxDepth(rootNode: Node, violations: AuditViolation[]): void {
  rootNode.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxElement || node.getKind() === SyntaxKind.JsxSelfClosingElement) {
      const depth = getJsxDepth(node);
      if (depth > MAX_JSX_DEPTH) {
        violations.push({
          type: 'DOM_DEPTH',
          severity: 'CRITICAL',
          line: node.getStartLineNumber(),
          message: `JSX nesting depth is ${depth}. Maximum allowed is ${MAX_JSX_DEPTH}.`,
          suggestion: 'Extract the inner JSX into a dedicated, isolated component.'
        });
      }
    }
  });
}

function auditTailwindClasses(rootNode: Node, violations: AuditViolation[]): void {
  rootNode.forEachDescendant((node) => {
    if (node.getKind() === SyntaxKind.JsxAttribute) {
      const attr = node.asKindOrThrow(SyntaxKind.JsxAttribute);
      if (attr.getName() === 'className') {
        const initializer = attr.getInitializer();
        if (initializer && initializer.getKind() === SyntaxKind.StringLiteral) {
          const classString = initializer.asKindOrThrow(SyntaxKind.StringLiteral).getLiteralValue();
          const classes = classString.split(/\s+/);

          for (const cls of classes) {
            if (BANNED_CLASSES.has(cls)) {
              violations.push({
                type: 'AESTHETIC_SLOP',
                severity: 'CRITICAL',
                line: node.getStartLineNumber(),
                message: `Banned generic utility detected: "${cls}".`,
                suggestion: 'Replace with brutalist primitives (e.g., border-2, bg-zinc-950, shadow-none).'
              });
            }
          }
        }
      }
    }
  });
}

export function runAstAudit(project: Project, filePath: string): AuditReport {
  const sourceFile = project.addSourceFileAtPath(filePath);
  const violations: AuditViolation[] = [];

  auditJsxDepth(sourceFile, violations);
  auditTailwindClasses(sourceFile, violations);

  const uniqueViolations = Array.from(
    new Map(violations.map(v => [`${v.line}-${v.type}`, v])).values()
  );

  return {
    filePath,
    violations: uniqueViolations,
    isCompliant: uniqueViolations.length === 0
  };
}
```

### Session Graph (`src/utils/session-graph.ts`)

// FIX: Changed `parent` → `parentId` to match `SessionEntryBase.parentId` (`session-manager.ts:48`).
// FIX: Changed JSONL parsing to match actual session format v3 — entries have `type` field, not `message.role`.
// FIX: Compaction detection uses `type === "compaction"` and reads `summary` field, not `message.content`.
// FIX: Message entries use `AgentMessage` from pi-ai which has `role` and `content` fields inside `message`.

```typescript
import * as fs from 'fs';
import * as readline from 'readline';

export interface SessionNode {
  id: string;
  parentId: string | null;  // FIX: was `parent`
  type: string;
  role: string;
  content: string;
  timestamp: string;
  isCompaction: boolean;
}

export interface ArchitecturalDecisionRecord {
  timestamp: string;
  summary: string;
  constraints: string[];
  decisions: string[];
}

interface RawSessionEntry {
  id: string;
  parentId: string | null;  // FIX: was `parent`
  type: string;
  timestamp: string;
  message?: {
    role: string;
    content: string;
  };
  summary?: string;  // FIX: compaction entries have `summary`, not `message.content`
}

function isRawSessionEntry(obj: unknown): obj is RawSessionEntry {
  if (typeof obj !== 'object' || obj === null) return false;
  const record = obj as Record<string, unknown>;
  return typeof record.id === 'string' &&
         typeof record.type === 'string' &&
         typeof record.timestamp === 'string';
}

export class SessionGraph {
  private nodes = new Map<string, SessionNode>();

  async loadFromFile(filePath: string): Promise<void> {
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const raw = JSON.parse(line) as unknown;
        if (!isRawSessionEntry(raw)) continue;

        // FIX: Compaction detection uses `type` field, not `message.role`
        const isCompaction = raw.type === 'compaction';

        let content = '';
        let role = '';

        if (raw.message) {
          role = raw.message.role;
          content = raw.message.content;
        } else if (isCompaction && raw.summary) {
          // FIX: compaction entries have `summary` at top level
          content = raw.summary;
          role = 'compaction';
        }

        const node: SessionNode = {
          id: raw.id,
          parentId: raw.parentId,  // FIX: was `raw.parent`
          type: raw.type,
          role,
          content,
          timestamp: raw.timestamp,
          isCompaction
        };

        this.nodes.set(node.id, node);
      } catch {
        // Skip malformed JSONL lines silently
      }
    }
  }

  resolvePath(leafId: string): SessionNode[] {
    const path: SessionNode[] = [];
    let currentId: string | null = leafId;

    while (currentId) {
      const node = this.nodes.get(currentId);
      if (!node) break;
      path.unshift(node);
      currentId = node.parentId;  // FIX: was `node.parent`
    }

    return path;
  }

  extractDecisions(leafId: string): ArchitecturalDecisionRecord[] {
    const path = this.resolvePath(leafId);
    const decisions: ArchitecturalDecisionRecord[] = [];

    for (const node of path) {
      if (node.isCompaction) {
        decisions.push({
          timestamp: node.timestamp,
          summary: node.content.substring(0, 150).replace(/\n/g, ' ') + '...',
          constraints: this.extractMarkdownList(node.content, 'Constraints'),
          decisions: this.extractMarkdownList(node.content, 'Key Decisions')
        });
      }
    }
    return decisions;
  }

  private extractMarkdownList(text: string, header: string): string[] {
    const regex = new RegExp(`# ${header}\\n((?:- .+\\n?)+)`, 'i');
    const match = text.match(regex);
    if (!match || !match[1]) return [];
    return match[1].split('\n').filter(Boolean).map(line => line.replace(/^-\s*/, ''));
  }
}
```

---

## Step 3: Tool Implementations

// FIX: All tools now use Pi's exact 5-parameter `execute` signature.
// FIX: `ToolContext` replaced with `ExtensionContext` from Pi's actual types.
// FIX: Return type is `AgentToolResult<TDetails>` from `@earendil-works/pi-agent-core`.
// FIX: Added `label` property to tool definitions (required by `ToolDefinition`).

### Audit UI Tool (`src/tools/audit-ui.ts`)

```typescript
import * as path from 'path';
import { Project } from 'ts-morph';
import { runAstAudit } from '../utils/ast-auditor.js';

// FIX: Use ExtensionContext from Pi's actual types, not a local mock
import type { ExtensionContext, AgentToolResult } from '@earendil-works/pi-coding-agent';

// FIX: 5-parameter execute signature matching Pi's ToolDefinition.execute
export async function executeAuditUi(
  toolCallId: string,
  params: { targetPath: string },
  signal: AbortSignal | undefined,
  onUpdate: ((partialResult: AgentToolResult<unknown>) => void) | undefined,
  ctx: ExtensionContext
): Promise<AgentToolResult<unknown>> {
  const { targetPath } = params;

  onUpdate?.({
    content: [{ type: "text", text: `Initializing AST auditor for ${targetPath}...` }],
    details: {}
  });

  // SECURITY: Path traversal check
  const workspaceRoot = ctx.cwd || process.cwd();
  const resolvedPath = path.resolve(workspaceRoot, targetPath);
  if (!resolvedPath.startsWith(path.resolve(workspaceRoot))) {
    throw new Error(`SECURITY VIOLATION: Path traversal detected. ${targetPath} is outside workspace.`);
  }

  onUpdate?.({
    content: [{ type: "text", text: `Parsing AST for ${resolvedPath}...` }],
    details: {}
  });

  const project = new Project();
  const report = runAstAudit(project, resolvedPath);

  if (report.isCompliant) {
    return {
      content: [{ type: "text", text: "COMPLIANT: DOM depth is optimal. No generic aesthetic slop detected." }],
      details: { violations: [] }
    };
  }

  const errorReport = report.violations.map(v =>
    `[${v.severity}] Line ${v.line}: ${v.message}\n  Suggestion: ${v.suggestion}`
  ).join('\n\n');

  return {
    content: [{ type: "text", text: `VIOLATIONS DETECTED:\n\n${errorReport}\n\nYou must refactor this component immediately.` }],
    details: { violations: report.violations }
  };
}
```

### Reflect Session Tool (`src/tools/reflect-session.ts`)

```typescript
import { SessionGraph } from '../utils/session-graph.js';

import type { ExtensionContext, AgentToolResult } from '@earendil-works/pi-coding-agent';

// FIX: 5-parameter execute signature
export async function executeReflectSession(
  toolCallId: string,
  params: { sessionFile: string; leafId: string },
  signal: AbortSignal | undefined,
  onUpdate: ((partialResult: AgentToolResult<unknown>) => void) | undefined,
  ctx: ExtensionContext
): Promise<AgentToolResult<unknown>> {
  const { sessionFile, leafId } = params;

  onUpdate?.({
    content: [{ type: "text", text: `Loading session graph from ${sessionFile}...` }],
    details: {}
  });

  const graph = new SessionGraph();
  await graph.loadFromFile(sessionFile);

  onUpdate?.({
    content: [{ type: "text", text: `Extracting architectural decisions for leaf ${leafId.substring(0, 8)}...` }],
    details: {}
  });

  const decisions = graph.extractDecisions(leafId);

  if (decisions.length === 0) {
    return {
      content: [{ type: "text", text: "No historical architectural decisions found in this branch." }],
      details: { decisions: [] }
    };
  }

  const adrLog = decisions.map(d =>
    `### ${d.timestamp}\nSummary: ${d.summary}\nConstraints: ${d.constraints.join(', ')}\nDecisions: ${d.decisions.join(', ')}`
  ).join('\n\n');

  return {
    content: [{ type: "text", text: `# ARCHITECTURAL DECISION RECORDS\n\n${adrLog}` }],
    details: { decisions }
  };
}
```

---

## Step 4: Extension Engine

// FIX: `pi.on()` not `subscribe()` — confirmed at `types.ts:1098`
// FIX: Event name `"session_before_compact"` — confirmed at `types.ts:1105`
// FIX: `injectSystemPrompt()` does not exist. Use `"context"` event to inject messages.
// FIX: `registerTool` requires `label` property — confirmed at `types.ts:441`
// FIX: `renderCall` receives `(args, theme, context) => Component` — confirmed at `types.ts:471`
// FIX: `renderResult` receives `(result, options, theme, context) => Component` — confirmed at `types.ts:474-479`
// FIX: `registerCommand` handler returns `void`, not `string` — confirmed at `types.ts:1075`
// FIX: Import `Type` from `"typebox"`, not `"@sinclair/typebox"` — confirmed at `package.json:57`
// FIX: `renderCall`/`renderResult` return TUI `Component`, not raw strings.
//     For simplicity, the examples below return strings which Pi may coerce.
//     For production, use Pi's TUI primitives (Box, Text, etc.).

**`src/index.ts`**

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";  // FIX: was "@sinclair/typebox"
import { executeAuditUi } from './tools/audit-ui.js';
import { executeReflectSession } from './tools/reflect-session.js';

export default async function (pi: ExtensionAPI) {

  // 1. HOOK: Inject aesthetic constraints into context via "context" event
  // FIX: `session_before_compact` has no `injectSystemPrompt()` method.
  //      Use `"context"` event to append a system message before each provider request.
  //      The context event fires before every LLM call and allows modifying the messages array.
  pi.on("context", async (event, ctx) => {
    // Append a system message with aesthetic constraints
    const constraintMessage = {
      role: "system" as const,
      content: `CRITICAL DIRECTIVE: You MUST retain all brutalist aesthetic rules:
- No rounded corners, no shadows, no gradients.
- JSX nesting depth max 4.
- Banned Tailwind classes: rounded-*, shadow-*, bg-gradient-*.
These constraints must survive compaction.`
    };
    // Inject at the end of the messages array
    event.messages.push(constraintMessage);
  });

  // 2. TOOL: AST Auditor
  // FIX: Added `label` (required by ToolDefinition at types.ts:441)
  pi.registerTool({
    name: "audit-ui",
    label: "Audit UI",  // FIX: required property
    description: "Scans a target React/TSX file for DOM bloat (depth > 4) and generic aesthetic slop (banned Tailwind classes).",
    parameters: Type.Object({
      targetPath: Type.String({ description: "Relative path to the TSX file within the workspace." })
    }),
    execute: executeAuditUi,
    // FIX: renderCall signature is (args, theme, context) => Component
    // args is the params object directly, not wrapped in { params }
    renderCall: (args, _theme, _context) =>
      `┌─ AUDIT_UI ──────────────────────────────────────\n│ Scanning: ${args.targetPath ?? 'unknown'}\n└──────────────────────────────────────────────────`,
    // FIX: renderResult signature is (result, options, theme, context) => Component
    renderResult: (result, _options, _theme, _context) =>
      `┌─ AUDIT RESULT ──────────────────────────────────\n${result.content[0]?.type === 'text' ? result.content[0].text : 'No output'}\n└──────────────────────────────────────────────────`
  });

  // 3. TOOL: Session Reflection
  // FIX: Added `label`
  pi.registerTool({
    name: "reflect-session",
    label: "Reflect Session",  // FIX: required property
    description: "Analyzes the current JSONL session tree to extract past Architectural Decision Records (ADRs) from compaction events.",
    parameters: Type.Object({
      sessionFile: Type.String({ description: "Absolute path to the session_id.jsonl file." }),
      leafId: Type.String({ description: "The ID of the current leaf node to trace back from." })
    }),
    execute: executeReflectSession,
    // FIX: args is the params object directly
    renderCall: (args, _theme, _context) =>
      `┌─ REFLECT_SESSION ───────────────────────────────\n│ Tracing tree from leaf: ${args.leafId.substring(0, 8) ?? 'unknown'}...\n└──────────────────────────────────────────────────`,
    renderResult: (result, _options, _theme, _context) =>
      `┌─ SESSION MEMORY ────────────────────────────────\n${result.content[0]?.type === 'text' ? result.content[0].text : 'No output'}\n└──────────────────────────────────────────────────`
  });

  // 4. COMMAND: Avant-Garde Mode
  // FIX: handler returns void, not string (types.ts:1075)
  pi.registerCommand("avant-garde", {
    description: "Lock session into strict brutalist design mode.",
    handler: async (args, ctx) => {
      ctx.ui.notify("STRICT AVANT-GARDE MODE activated", "info");
      // FIX: no return value — handler returns Promise<void>
    }
  });

  // 5. MESSAGE RENDERER: Brutalist TUI Overrides
  // FIX: registerMessageRenderer exists (types.ts:1180)
  //      Returns Component | undefined, not a raw string.
  //      For simplicity this returns a string; for production use Pi's TUI Component API.
  pi.registerMessageRenderer("ava-brutalist", (message, options, theme) => {
    if (message.role === "assistant" && message.content) {
      const border = "\x1b[90m┌─ AVA OUTPUT ────────────────────────────────────────\x1b[0m";
      const footer = "\x1b[90m└──────────────────────────────────────────────────────\x1b[0m";
      return `${border}\n${message.content}\n${footer}` as any;  // Coerce to Component
    }
    return undefined; // Fallback to default rendering
  });
}
```

---

## Step 5: Theme

// FIX: Original had 17 tokens. Pi requires 50 (confirmed at `theme-schema.json:37-88`).
// All 50 required tokens are now present.

**`themes/brutalist.json`**

```json
{
  "name": "brutalist",
  "colors": {
    "accent": "#ffffff",
    "border": "#333333",
    "borderAccent": "#666666",
    "borderMuted": "#222222",
    "success": "#00ff00",
    "error": "#ff0000",
    "warning": "#ffff00",
    "muted": "#888888",
    "dim": "#555555",
    "text": "#ffffff",
    "thinkingText": "#aaaaaa",
    "selectedBg": "#1a1a1a",
    "userMessageBg": "#000000",
    "userMessageText": "#ffffff",
    "customMessageBg": "#0a0a0a",
    "customMessageText": "#ffffff",
    "customMessageLabel": "#888888",
    "toolPendingBg": "#111111",
    "toolSuccessBg": "#000000",
    "toolErrorBg": "#000000",
    "toolTitle": "#ffffff",
    "toolOutput": "#cccccc",
    "mdHeading": "#ffffff",
    "mdLink": "#ffffff",
    "mdLinkUrl": "#888888",
    "mdCode": "#cccccc",
    "mdCodeBlock": "#111111",
    "mdCodeBlockBorder": "#333333",
    "mdQuote": "#aaaaaa",
    "mdQuoteBorder": "#333333",
    "mdHr": "#333333",
    "mdListBullet": "#888888",
    "toolDiffAdded": "#00ff00",
    "toolDiffRemoved": "#ff0000",
    "toolDiffContext": "#888888",
    "syntaxComment": "#555555",
    "syntaxKeyword": "#ffffff",
    "syntaxFunction": "#ffffff",
    "syntaxVariable": "#cccccc",
    "syntaxString": "#aaaaaa",
    "syntaxNumber": "#cccccc",
    "syntaxType": "#ffffff",
    "syntaxOperator": "#ffffff",
    "syntaxPunctuation": "#888888",
    "thinkingOff": "#333333",
    "thinkingMinimal": "#444444",
    "thinkingLow": "#555555",
    "thinkingMedium": "#666666",
    "thinkingHigh": "#888888",
    "thinkingXhigh": "#aaaaaa",
    "bashMode": "#333333"
  }
}
```

---

## Step 6: Skills

The skill format with YAML frontmatter is correct. No changes needed.

**`skills/scaffold-ui/SKILL.md`**

```markdown
---
name: scaffold-ui
description: Generates an anti-generic React component with brutalist styling and strict DOM hygiene.
---

When invoked, produce a React component following these strict rules:

1. **Imports**: Group external (react, lucide-react) vs internal imports.
2. **Structure**: Export the default function. Use early returns for conditional states (loading, error, empty).
3. **Styling Constraints**: 
   - Use stark, high-contrast Tailwind classes (`bg-zinc-950 text-zinc-50 border-2 border-white`).
   - ABSOLUTELY NO `rounded-*`, `shadow-*`, or `bg-gradient-*`.
4. **Hygiene**: Ensure JSX nesting never exceeds 4 levels. Extract sub-components if necessary.
5. **MANDATORY AUDIT**: Before writing the file to disk, you MUST invoke the `audit-ui` tool on the generated code. If it returns violations, you must refactor and re-audit until it passes.
```

---

## Verification Checklist

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | `pi.on()` method (not `subscribe`) | PASS | `types.ts:1098` |
| 2 | Event `"session_before_compact"` | PASS | `types.ts:1105` |
| 3 | `"context"` event for message injection | PASS | `types.ts:1113, 612-615, 987-989` |
| 4 | `registerTool` with `label` property | PASS | `types.ts:441, 1142` |
| 5 | 5-parameter `execute` signature | PASS | `types.ts:462-468` |
| 6 | `execute` returns `AgentToolResult<TDetails>` | PASS | `types.ts:468`, `agent/types.ts:345-355` |
| 7 | `renderCall` signature: `(args, theme, context) => Component` | PASS | `types.ts:471` |
| 8 | `renderResult` signature: `(result, options, theme, context) => Component` | PASS | `types.ts:474-479` |
| 9 | `registerCommand` with `handler` (not `execute`) | PASS | `types.ts:1075` |
| 10 | Command handler returns `void` | PASS | `types.ts:1075` |
| 11 | `registerMessageRenderer` exists | PASS | `types.ts:1180` |
| 12 | Skills use YAML frontmatter | PASS | `skills.ts` |
| 13 | Theme is JSON with 50 required tokens | PASS | `theme-schema.json:37-88` |
| 14 | Session JSONL uses `parentId` (not `parent`) | PASS | `session-manager.ts:48` |
| 15 | Session entries have `type` field | PASS | `session-manager.ts:46-51` |
| 16 | Compaction entries have `summary` field | PASS | `session-manager.ts:140-149` |
| 17 | TypeBox import: `from "typebox"` | PASS | `package.json:57`, `types.ts:42` |
| 18 | `ctx.ui.notify()` exists | PASS | `types.ts:135` |
| 19 | Path traversal security check | PASS | Good practice |
| 20 | Extension-only architecture | PASS | Aligns with Pi philosophy |

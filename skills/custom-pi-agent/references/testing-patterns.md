# TDD Patterns for Pi Extensions

Patterns derived from pi's own test suite (`test/`) and the AVA Agent implementation plan.

## Test Framework

Vitest 3.2.4 (matching pi's devDependencies). Config:

```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node' },
});
```

## Pure Utility Tests (No Pi Dependency)

For parsers, validators, and pure transformations. Use temp files for fixtures.

### Session JSONL Reader Pattern

```typescript
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SessionGraph } from '../src/utils/session-graph.js';

function createFixture(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'ava-test-'));
  const path = join(dir, 'session.jsonl');
  writeFileSync(path, content, 'utf-8');
  return path;
}

describe('SessionGraph', () => {
  it('loads and resolves a linear chain', async () => {
    const path = createFixture(
      '{"type":"message","id":"root","parentId":null,"timestamp":"2025-01-01T00:00:00.000Z","message":{"role":"user","content":"Hello"}}\n' +
      '{"type":"message","id":"msg1","parentId":"root","timestamp":"2025-01-01T00:00:01.000Z","message":{"role":"assistant","content":"Hi"}}\n'
    );
    const graph = new SessionGraph();
    await graph.loadFromFile(path);
    const pathResult = graph.resolvePath('msg1');
    expect(pathResult).toHaveLength(2);
    expect(pathResult[0]!.id).toBe('root');
    expect(pathResult[1]!.id).toBe('msg1');
    rmSync(path, { recursive: true });
  });
});
```

### AST Auditor Pattern (ts-morph)

```typescript
import { describe, expect, it } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Project } from 'ts-morph';

function analyzeComponent(content: string) {
  const dir = mkdtempSync(join(tmpdir(), 'ast-test-'));
  const path = join(dir, 'Component.tsx');
  writeFileSync(path, content, 'utf-8');
  const project = new Project({ useInMemoryFileSystem: true });
  project.createSourceFile(path, content);
  const report = runAstAudit(project, path); // your function
  rmSync(dir, { recursive: true });
  return report;
}

describe('AST Auditor', () => {
  it('flags banned tailwind classes', () => {
    const report = analyzeComponent(`export function Bad() { return <div className="rounded-lg shadow-md">content</div>; }`);
    expect(report.isCompliant).toBe(false);
    expect(report.violations).toHaveLength(2);
  });
});
```

## Tool Wrapper Tests (Mocked ExtensionContext)

Use `vi.mock()` to replace pure utilities, then construct a minimal `ExtensionContext`.

### MockExtensionContext Factory

```typescript
import { vi } from 'vitest';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

function createMockContext(overrides?: Partial<ExtensionContext>): ExtensionContext {
  return {
    cwd: '/tmp/test-workspace',
    mode: 'print' as const,
    hasUI: false,
    ui: { notify: vi.fn(), onTerminalInput: vi.fn(), setStatus: vi.fn(), setWorkingMessage: vi.fn(), setWorkingVisible: vi.fn() } as any,
    sessionManager: {} as any,
    modelRegistry: {} as any,
    model: undefined,
    isIdle: () => true,
    signal: undefined,
    abort: vi.fn(),
    hasPendingMessages: () => false,
    shutdown: vi.fn(),
    getContextUsage: () => undefined,
    compact: vi.fn(),
    getSystemPrompt: () => '',
    ...overrides,
  } as unknown as ExtensionContext;
}
```

### Tool Test Pattern

```typescript
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/ast-auditor.js', () => ({
  runAstAudit: vi.fn(),
}));

import { runAstAudit } from '../src/utils/ast-auditor.js';

describe('AuditUI tool', () => {
  it('returns COMPLIANT for clean components', async () => {
    vi.mocked(runAstAudit).mockReturnValue({ filePath: 'test.tsx', violations: [], isCompliant: true });
    const result = await executeAuditUi('call-1', { targetPath: 'test.tsx' }, undefined, undefined, createMockContext());
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect((result.content[0] as any).text).toContain('COMPLIANT');
  });

  it('throws on path traversal', async () => {
    const ctx = createMockContext({ cwd: '/safe' });
    await expect(executeAuditUi('call-1', { targetPath: '../../etc/passwd' }, undefined, undefined, ctx))
      .rejects.toThrow('SECURITY VIOLATION');
  });
});
```

## Extension Engine Tests (Mocked ExtensionAPI)

### MockExtensionAPI Factory

```typescript
import { vi } from 'vitest';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

function createMockAPI(): ExtensionAPI {
  return {
    on: vi.fn(),
    registerTool: vi.fn(),
    registerCommand: vi.fn(),
    registerShortcut: vi.fn(),
    registerFlag: vi.fn(),
    getFlag: vi.fn(),
    registerMessageRenderer: vi.fn(),
    sendMessage: vi.fn(),
    sendUserMessage: vi.fn(),
    appendEntry: vi.fn(),
    setSessionName: vi.fn(),
    getSessionName: vi.fn(() => undefined),
    setLabel: vi.fn(),
    exec: vi.fn(),
    getActiveTools: vi.fn(() => []),
    getAllTools: vi.fn(() => []),
    setActiveTools: vi.fn(),
    getCommands: vi.fn(() => []),
    setModel: vi.fn(() => Promise.resolve(true)),
    getThinkingLevel: vi.fn(),
    setThinkingLevel: vi.fn(),
    registerProvider: vi.fn(),
    registerModel: vi.fn(),
    onTerminalInput: vi.fn(),
  } as unknown as ExtensionAPI;
}
```

### Extension Test Pattern

```typescript
describe('Extension entry point', () => {
  it('registers both tools and command', async () => {
    const api = createMockAPI();
    await defaultExport(api);
    expect(api.registerTool).toHaveBeenCalledTimes(2);
    expect(api.registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: 'audit-ui' }));
    expect(api.registerCommand).toHaveBeenCalledWith('avant-garde', expect.any(Object));
    expect(api.registerMessageRenderer).toHaveBeenCalledWith('ava-brutalist', expect.any(Function));
    expect(api.on).toHaveBeenCalledWith('context', expect.any(Function));
  });

  it('context handler injects system message', async () => {
    const api = createMockAPI();
    await defaultExport(api);
    const eventName = vi.mocked(api.on).mock.calls.find(c => c[0] === 'context')![1];
    const messages: any[] = [];
    await eventName({ type: 'context', messages }, {} as any);
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toContain('CRITICAL DIRECTIVE');
  });
});
```

## Fixture Management

Small test cases: inline fixture generation using temp files. Complex cases: committed JSONL in `test/fixtures/` loaded via `readFileSync`:

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
function loadFixture(name: string): string {
  return readFileSync(join(__dirname, '..', 'fixtures', name), 'utf-8');
}
```

Fixture file format (`sample-session.jsonl`):
```
{"type":"message","id":"root","parentId":null,"timestamp":"...","message":{"role":"user","content":"Start"}}
```

## Running Tests

```bash
npm test                                    # All tests
npx vitest --run test/specific.test.ts      # Single file
npx vitest test/specific.test.ts            # Watch mode
```

## Test Coverage Goals

- Pure utilities: 100% statement coverage
- Tool wrappers: 100% execution paths (mock utility, test wrapper)
- Extension engine: All registration calls verified, event handlers invoked
- Edge cases: Empty lists, malformed input, path traversal, abort signals

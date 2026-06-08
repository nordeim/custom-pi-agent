import { describe, expect, it, vi } from 'vitest';
import { executeAuditUi } from '../../src/tools/audit-ui.js';
import { runAstAudit } from '../../src/utils/ast-auditor.js';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

vi.mock('../../src/utils/ast-auditor.js', () => ({
  runAstAudit: vi.fn(),
}));

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

describe('executeAuditUi', () => {
  it('returns compliant for clean components', async () => {
    vi.mocked(runAstAudit).mockReturnValue({
      filePath: 'test.tsx',
      violations: [],
      isCompliant: true,
    });
    const result = await executeAuditUi('call-1', { targetPath: 'test.tsx' }, undefined, undefined, createMockContext());
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect((result.content[0] as any).text).toContain('COMPLIANT');
  });

  it('returns violations for bad components', async () => {
    vi.mocked(runAstAudit).mockReturnValue({
      filePath: 'test.tsx',
      violations: [{ type: 'AESTHETIC_SLOP', severity: 'CRITICAL', message: 'Bad class', line: 1, suggestion: 'Fix it' }],
      isCompliant: false,
    });
    const result = await executeAuditUi('call-1', { targetPath: 'test.tsx' }, undefined, undefined, createMockContext());
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect((result.content[0] as any).text).toContain('VIOLATIONS');
  });

  it('throws on path traversal', async () => {
    const ctx = createMockContext({ cwd: '/safe' });
    await expect(executeAuditUi('call-1', { targetPath: '../../etc/passwd' }, undefined, undefined, ctx))
      .rejects.toThrow('SECURITY VIOLATION');
  });

  it('calls onUpdate when provided', async () => {
    vi.mocked(runAstAudit).mockReturnValue({
      filePath: 'test.tsx',
      violations: [],
      isCompliant: true,
    });
    const onUpdate = vi.fn();
    await executeAuditUi('call-1', { targetPath: 'test.tsx' }, undefined, onUpdate, createMockContext());
    expect(onUpdate).toHaveBeenCalledWith(expect.any(Object));
  });

  it('throws when signal is aborted', async () => {
    vi.mocked(runAstAudit).mockReturnValue({
      filePath: 'test.tsx',
      violations: [],
      isCompliant: true,
    });
    const controller = new AbortController();
    controller.abort();
    await expect(executeAuditUi('call-1', { targetPath: 'test.tsx' }, controller.signal, undefined, createMockContext()))
      .rejects.toThrow('Aborted');
  });
});
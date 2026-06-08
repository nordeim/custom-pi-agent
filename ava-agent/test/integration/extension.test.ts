import { describe, expect, it, vi } from 'vitest';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import extension from '../../src/index.js';
import { executeAuditUi } from '../../src/tools/audit-ui.js';
import { executeReflectSession } from '../../src/tools/reflect-session.js';

function createMockAPI(): ExtensionAPI {
  return {
    on: vi.fn(),
    registerTool: vi.fn(),
    registerCommand: vi.fn(),
    registerMessageRenderer: vi.fn(),
    registerShortcut: vi.fn(),
    registerFlag: vi.fn(),
    getFlag: vi.fn(),
    sendMessage: vi.fn(),
    sendUserMessage: vi.fn(),
    appendEntry: vi.fn(),
    setSessionName: vi.fn(),
    getSessionName: vi.fn(() => undefined),
    setLabel: vi.fn(),
    exec: vi.fn(),
  } as unknown as ExtensionAPI;
}

describe('Extension Engine', () => {
  it('default export is a callable async function', () => {
    expect(typeof extension).toBe('function');
  });

  it('registers two tools with correct names', async () => {
    const mockAPI = createMockAPI();
    await extension(mockAPI);
    expect(mockAPI.registerTool).toHaveBeenCalledTimes(2);
    expect(mockAPI.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'audit-ui' }),
    );
    expect(mockAPI.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'reflect-session' }),
    );
  });

  it('registers /avant-garde command', async () => {
    const mockAPI = createMockAPI();
    await extension(mockAPI);
    expect(mockAPI.registerCommand).toHaveBeenCalledWith(
      'avant-garde',
      expect.any(Object),
    );
  });

  it('registers ava-brutalist message renderer', async () => {
    const mockAPI = createMockAPI();
    await extension(mockAPI);
    expect(mockAPI.registerMessageRenderer).toHaveBeenCalledWith(
      'ava-brutalist',
      expect.any(Function),
    );
  });

  it('subscribes to context event', async () => {
    const mockAPI = createMockAPI();
    await extension(mockAPI);
    expect(mockAPI.on).toHaveBeenCalledWith('context', expect.any(Function));
  });

  it('tool execute functions match imported implementations', async () => {
    const mockAPI = createMockAPI();
    await extension(mockAPI);
    const calls = (mockAPI.registerTool as any).mock.calls;
    const tools = calls.map((call: any[]) => call[0]);
    const auditTool = tools.find((t: any) => t.name === 'audit-ui');
    const reflectTool = tools.find((t: any) => t.name === 'reflect-session');
    expect(auditTool).toBeDefined();
    expect(reflectTool).toBeDefined();
    expect(auditTool.execute).toBe(executeAuditUi);
    expect(reflectTool.execute).toBe(executeReflectSession);
  });
});
import { describe, expect, it, vi } from 'vitest';
import { executeReflectSession } from '../../src/tools/reflect-session.js';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

function createMockContext(): ExtensionContext {
  return {} as unknown as ExtensionContext;
}

describe('executeReflectSession', () => {
  it('calls onUpdate for progress', async () => {
    const onUpdate = vi.fn();
    try {
      await executeReflectSession('call-1', { sessionFile: '/tmp/nonexistent.jsonl', leafId: 'leaf1' }, undefined, onUpdate, createMockContext());
    } catch {
      // Expected: file doesn't exist
    }
    expect(onUpdate).toHaveBeenCalled();
  });
});
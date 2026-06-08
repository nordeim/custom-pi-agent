import { describe, expect, it, vi } from 'vitest';
import { executeReflectSession } from '../../src/tools/reflect-session.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('executeReflectSession', () => {
  it('returns formatted ADR log when decisions exist', async () => {
    const result = await executeReflectSession(
      'call-1',
      { sessionFile: join(__dirname, '..', 'fixtures', 'sample-session.jsonl'), leafId: 'msg2' },
      undefined,
      undefined,
      {} as any,
    );
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect((result.content[0] as any).text).toContain('ARCHITECTURAL DECISION RECORDS');
  });

  it('returns no-decisions message when none exist', async () => {
    const result = await executeReflectSession(
      'call-1',
      { sessionFile: join(__dirname, '..', 'fixtures', 'no-compaction.jsonl'), leafId: 'msg1' },
      undefined,
      undefined,
      {} as any,
    );
    expect(result.content[0]).toMatchObject({ type: 'text' });
    expect((result.content[0] as any).text).toContain('No historical');
  });

  it('throws for non-existent file', async () => {
    await expect(executeReflectSession(
      'call-1',
      { sessionFile: '/nonexistent.jsonl', leafId: 'leaf1' },
      undefined,
      undefined,
      {} as any,
    )).rejects.toThrow();
  });

  it('calls onUpdate for progress', async () => {
    const onUpdate = vi.fn();
    try {
      await executeReflectSession('call-1', { sessionFile: '/tmp/nonexistent.jsonl', leafId: 'leaf1' }, undefined, onUpdate, {} as any);
    } catch {
      // Expected: file doesn't exist
    }
    expect(onUpdate).toHaveBeenCalled();
  });
});
import { describe, expect, it } from 'vitest';
import { SessionGraph } from '../../src/utils/session-graph.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('SessionGraph', () => {
  it('loads and resolves a linear chain', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'sample-session.jsonl'));
    const path = graph.resolvePath('msg2');
    expect(path).toHaveLength(4);
    expect(path[0]!.id).toBe('root');
    expect(path[1]!.id).toBe('msg1');
    expect(path[2]!.id).toBe('comp1');
    expect(path[3]!.id).toBe('msg2');
  });

  it('returns empty for unknown leaf', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'sample-session.jsonl'));
    const path = graph.resolvePath('nonexistent');
    expect(path).toHaveLength(0);
  });

  it('extracts decisions from compaction', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'sample-session.jsonl'));
    const decisions = graph.extractDecisions('msg2');
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.summary).toContain('Use TypeScript strict');
  });

  it('returns empty for no-compaction session', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'sample-session.jsonl'));
    const decisions = graph.extractDecisions('root');
    expect(decisions).toHaveLength(0);
  });
});
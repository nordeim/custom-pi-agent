import { describe, expect, it } from 'vitest';
import { SessionGraph } from '../../src/utils/session-graph.js';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

describe('SessionGraph', () => {
  // ========== Existing 4 tests ==========
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

  // ========== NEW: A1 - Empty file ==========
  it('handles empty file', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'empty.jsonl'));
    const path = graph.resolvePath('anything');
    expect(path).toHaveLength(0);
  });

  // ========== NEW: A2 - Malformed JSONL ==========
  it('skips malformed lines and loads valid ones', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'malformed.jsonl'));
    const path = graph.resolvePath('root');
    // The first line is valid JSON, so root should be loadable
    expect(path).toHaveLength(1);
    expect(path[0]!.id).toBe('root');
  });

  // ========== NEW: A3 - Cyclic parentId (TDD: needs code fix) ==========
  it('handles cyclic parentId without infinite loop', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'cyclic.jsonl'));
    const path = graph.resolvePath('a');
    // Should not hang; should return a finite path
    expect(path.length).toBeGreaterThan(0);
    expect(path.length).toBeLessThanOrEqual(3);
  });

  // ========== NEW: A4 - No compaction entries session ==========
  it('returns empty for session with no compaction entries', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'no-compaction.jsonl'));
    // Try extracting from msg1 (leaf)
    const decisions = graph.extractDecisions('msg1');
    expect(decisions).toHaveLength(0);
  });

  // ========== NEW: A5 - Multiple compaction entries ==========
  it('extracts all decisions from multiple compactions', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'multiple-compactions.jsonl'));
    const decisions = graph.extractDecisions('comp2');
    expect(decisions).toHaveLength(2);
    expect(decisions[0]!.summary).toContain('Use strict TS');
    expect(decisions[1]!.summary).toContain('No any');
  });

  // ========== NEW: A6 - Missing markdown headers ==========
  it('handles missing markdown headers gracefully', async () => {
    const graph = new SessionGraph();
    await graph.loadFromFile(join(__dirname, '..', 'fixtures', 'bad-header.jsonl'));
    const decisions = graph.extractDecisions('comp1');
    expect(decisions).toHaveLength(1);
    expect(decisions[0]!.constraints).toHaveLength(0);
    expect(decisions[0]!.decisions).toHaveLength(0);
  });
});
import { describe, expect, it } from 'vitest';
import { Project } from 'ts-morph';
import { runAstAudit } from '../../src/utils/ast-auditor.js';

describe('runAstAudit', () => {
  it('returns compliant for a clean React component', () => {
    const source = `export function Button() {
      return <div className="bg-zinc-950 text-zinc-50 border-2">Click</div>;
    }`;
    const project = new Project({ useInMemoryFileSystem: true });
    const file = project.createSourceFile('test.tsx', source);
    const report = runAstAudit(project, file.getFilePath());
    expect(report.isCompliant).toBe(true);
    expect(report.violations).toHaveLength(0);
  });

  it('detects banned Tailwind classes', () => {
    const source = `export function Bad() {
      return <div className="rounded-lg shadow-md bg-gradient-to-r">Bad</div>;
    }`;
    const project = new Project({ useInMemoryFileSystem: true });
    const file = project.createSourceFile('test.tsx', source);
    const report = runAstAudit(project, file.getFilePath());
    expect(report.isCompliant).toBe(false);
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
    const slip = report.violations[0]!;
    expect(slip.type).toBe('AESTHETIC_SLOP');
  });

  it('detects deep JSX nesting', () => {
    const source = `export function Deep() {
      return (
        <div>
          <div>
            <div>
              <div>
                <div>
                  <div>Too deep</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }`;
    const project = new Project({ useInMemoryFileSystem: true });
    const file = project.createSourceFile('test.tsx', source);
    const report = runAstAudit(project, file.getFilePath());
    expect(report.isCompliant).toBe(false);
    expect(report.violations.some(v => v.type === 'DOM_DEPTH')).toBe(true);
  });

  it('deduplicates repeated violations on the same line', () => {
    const source = `export function Dupe() {
      return <div className="rounded-lg rounded-lg">Dupe</div>;
    }`;
    const project = new Project({ useInMemoryFileSystem: true });
    const file = project.createSourceFile('test.tsx', source);
    const report = runAstAudit(project, file.getFilePath());
    expect(report.isCompliant).toBe(false);
    expect(report.violations.length).toBe(1);
  });

  it('throws for non-existent files', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    expect(() => runAstAudit(project, '/nonexistent.tsx')).toThrow();
  });
});
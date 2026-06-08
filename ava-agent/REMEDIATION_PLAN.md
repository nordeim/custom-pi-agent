# Remediation Plan: AVA Agent Extension

**Date**: 2026-06-08
**Current State**: 14/31 tests passing (45% coverage)
**Target State**: 31/31 tests passing (100% coverage) + validated static assets

---

## 1. Root Cause Analysis

### 1.1 Test Coverage Gaps (Primary Issue)

| Phase | Tests Planned | Tests Implemented | Missing | Root Cause |
|-------|--------------|-------------------|---------|------------|
| 1: AST Auditor | 5 | 5 | 0 | ✅ Complete |
| 2: Session Graph | 10 | 4 | 6 | Time constraint; focused on happy path only |
| 3: Audit-UI Tool | 5 | 4 | 1 | Signal test skipped |
| 4: Reflect-Session | 4 | 1 | 3 | Only onUpdate tested; core logic not verified |
| 5: Extension Engine | 6 | 0 | 6 | Not started; requires mock ExtensionAPI |
| 6: Theme | Manual | 0 | N/A | No automated schema validation |
| 7: Skill | Manual | 0 | N/A | No automated frontmatter validation |
| 8: Integration | 1 | 0 | 1 | Not started; requires FauxProvider |

### 1.2 Code Quality Notes

| Issue | Location | Severity | Root Cause | Fix Strategy |
|-------|----------|----------|------------|-------------|
| `as any` in renderCall/renderResult | `src/index.ts:38-41, 54-57` | Minor | `Component` type from pi-tui requires `new Text("...")` constructor | Keep `as any` — importing pi-tui for `Text` adds heavy dep |
| Duplicate targetPath destructuring | `src/tools/audit-ui.ts:12` | Trivial | Typo `{ targetPath: targetPath }` instead of `{ targetPath }` | Fix to `{ targetPath }` |
| reflect-session test has empty mock | `test/tools/reflect-session.test.ts:6-8` | Trivial | Minimal mock was sufficient for onUpdate test | Add meaningful mock or integrate |

---

## 2. Remediation ToDo List

### Phase A: Session Graph Tests (6 tests)
- [ ] A1: `loadFromFile` with empty file → nodes is empty map
- [ ] A2: `loadFromFile` with malformed JSONL line → skips, loads valid ones
- [ ] A3: `resolvePath` with cyclic parentId → breaks on already-visited
- [ ] A4: `extractDecisions` with no compaction entries → empty array
- [ ] A5: `extractDecisions` with multiple compaction entries → all extracted
- [ ] A6: `extractMarkdownList` with non-existent header → empty array

### Phase B: Audit-UI Tool Test (1 test)
- [ ] B1: `executeAuditUi` respects `signal` (abort if signal.aborted)

### Phase C: Reflect-Session Tests (3 tests)
- [ ] C1: File containing decisions → returns formatted ADR log
- [ ] C2: File with no decisions → "No historical architectural decisions found"
- [ ] C3: Non-existent file → throws (SessionGraph throws)

### Phase D: Extension Engine Tests (6 tests)
- [ ] D1: `export default function` exists and is callable
- [ ] D2: `pi.registerTool` called exactly 2 times (audit-ui, reflect-session)
- [ ] D3: `pi.registerCommand` called with "avant-garde"
- [ ] D4: `pi.registerMessageRenderer` called with "ava-brutalist"
- [ ] D5: `pi.on` called with "context"
- [ ] D6: Tool execute functions match imported implementations

### Phase E: Theme Validation (manual script)
- [ ] E1: Verify all 50 tokens match `theme-schema.json` required list

### Phase F: Skill Validation (manual script)
- [ ] F1: Verify frontmatter parses with Pi's `parseFrontmatter`

### Phase G: Code Quality Fixes
- [ ] G1: Fix `{ targetPath: targetPath }` to `{ targetPath }`
- [ ] G2: Verify no new `any` introduced in source files

---

## 3. Execution Order (TDD)

```
Phase A (6 tests)  → Phase B (1 test) → Phase C (3 tests)
       ↓
Phase D (6 tests) → Phase G (code fixes)
       ↓
Phase E + F (manual validation)
       ↓
Final: 31/31 tests pass + tsc --noEmit clean
```

---

## 4. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| ExtensionAPI interface changes | Low | High | Mock based on current types; update if API changes |
| FauxProvider unavailable for integration | Low | Medium | Skip Phase 8 if unavailable; unit tests sufficient |
| Theme schema validation needs AJV dep | Low | Low | Use node script with JSON.parse + manual check |

---

## 5. Success Criteria

- [ ] All 31 tests pass (`npx vitest run`)
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
- [ ] No `any` in source files (except acknowledged `renderCall/renderResult`)
- [ ] Theme has all 50 required tokens
- [ ] Skill frontmatter is valid YAML

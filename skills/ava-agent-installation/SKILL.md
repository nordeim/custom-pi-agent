---
name: ava-agent-installation
description: Install, verify, and uninstall the AVA Agent pi extension to ~/.pi/agent/extensions/
allowed-tools: Read, Write, Edit, Bash
version: 1.0
priority: HIGH
---

# AVA Agent Extension Installation

Installs the AVA (Avant-Garde Visual Auditor) extension into a system pi-coding-agent at `~/.pi/agent/extensions/`.

## What Is Being Installed

| Component | Type | What It Does | Destination |
|-----------|------|-------------|-------------|
| `audit-ui` | Tool | Scans TSX files for DOM bloat and banned Tailwind classes | Loaded via extension API |
| `reflect-session` | Tool | Extracts architectural decisions from session compactions | Loaded via extension API |
| `avant-garde` | Command | Activates strict brutalist design mode | Loaded via extension API |
| `ava-brutalist` | Message renderer | Wraps assistant output in borders | Loaded via extension API |
| `brutalist` | Theme | 虽不-token high-contrast monochrome theme | `~/.pi/agent/themes/` |
| `scaffold-ui` | Skill | Enforces brutalist constraints in generated code | `~/.pi/agent/skills/` |

## Prerequisites

| Requirement | Version | Verify Command | Action If Missing |
|-------------|---------|----------------|-------------------|
| Node.js | >=22.19.0 | `node --version` | Install from nodejs.org |
| npm or pnpm | >=10 | `npm --version` | Included with Node.js |
| pi-coding-agent | ^0.78.1 | `pi --version` | `npm install -g @earendil-works/pi-coding-agent` |

## Installation Steps

### Step 1: Locate Extension Source

Ensure the extension source is available at a known path.

```
ava-agent/
  src/
    index.ts              — Extension entry point
    utils/
      ast-auditor.ts      — AST analysis
      session-graph.ts    — Session JSONL parser
    tools/
      audit-ui.ts         — Audit tool wrapper
      reflect-session.ts  — Session reflection tool
  themes/
    brutalist.json
  skills/
    scaffold-ui/
      SKILL.md
```

### Step 2: Create Extension Directory

```bash
mkdir -p ~/.pi/agent/extensions/ava-agent
```

### Step 3: Copy Extension Source

```bash
SOURCE_DIR=/path/to/ava-agent  # adjust as needed
cp -r "$SOURCE_DIR/src" ~/.pi/agent/extensions/ava-agent/
```

### Step 4: Create package.json

Create `~/.pi/agent/extensions/ava-agent/package.json`:

```json
{
  "name": "ava-agent",
  "version": "0.1.0",
  "description": "AVA — Avant-Garde Visual Auditor for pi-coding-agent",
  "type": "module",
  "dependencies": {
    "ts-morph": "^28.0.0",
    "typebox": "^1.1.38"
  }
}
```

### Step 5: Install Dependencies

```bash
cd ~/.pi/agent/extensions/ava-agent
npm install
```

Verify `node_modules/ts-morph/` and `node_modules/typebox/` exist after this step.

### Step 6: Create Entry Point

Create `~/.pi/agent/extensions/ava-agent/index.ts`:

```typescript
export { default } from './src/index.js';
```

### Step 7: Install Theme

```bash
mkdir -p ~/.pi/agent/themes
cp ~/.pi/agent/extensions/ava-agent/themes/brutalist.json ~/.pi/agent/themes/
```

Verify 51 tokens:

```bash
node -e "const t = require(require('path').join(process.env.HOME, '.pi/agent/themes/brutalist.json')); console.log('Theme tokens:', Object.keys(t.colors).length);"
```

### Step 8: Install Skill

```bash
mkdir -p ~/.pi/agent/skills/scaffold-ui
cp ~/.pi/agent/extensions/ava-agent/skills/scaffold-ui/SKILL.md ~/.pi/agent/skills/scaffold-ui/
```

## Verification

### Check Extension Directory Structure

```bash
find ~/.pi/agent/extensions/ava-agent -maxdepth 3 -type f | sort
```

Expected:
- `~/.pi/agent/extensions/ava-agent/index.ts`
- `~/.pi/agent/extensions/ava-agent/src/index.ts`
- `~/.pi/agent/extensions/ava-agent/src/utils/ast-auditor.ts`
- `~/.pi/agent/extensions/ava-agent/src/utils/session-graph.ts`
- `~/.pi/agent/extensions/ava-agent/src/tools/audit-ui.ts`
- `~/.pi/agent/extensions/ava-agent/src/tools/reflect-session.ts`
- `~/.pi/agent/extensions/ava-agent/node_modules/ts-morph/package.json`
- `~/.pi/agent/extensions/ava-agent/node_modules/typebox/package.json`

### Verify Theme Installation

```bash
ls ~/.pi/agent/themes/brutalist.json
node -e "const t = require(require('path').join(process.env.HOME, '.pi/agent/themes/brutalist.json')); console.log(t.name, '-', Object.keys(t.colors).length, 'tokens');"
```

### Verify Skill Installation

```bash
ls ~/.pi/agent/skills/scaffold-ui/SKILL.md
head -5 ~/.pi/agent/skills/scaffold-ui/SKILL.md
```

## Troubleshooting

### Extension Not Loaded at Startup

**Symptoms**: No `audit-ui` or `reflect-session` in tool list.

**Diagnosis Steps**:
1. Check `~/.pi/agent/extensions/ava-agent/index.ts` exists and is readable
2. Check `pi` loads global extensions (should load from `~/.pi/agent/extensions/` automatically)
3. Check for errors in pi startup output

**Fix**:
```bash
# Force pi to load a specific extension for testing
pi --extension ~/.pi/agent/extensions/ava-agent/index.ts
```

### Cannot Find Module 'ts-morph'

**Symptoms**: `ERR_MODULE_NOT_FOUND` for `ts-morph`.

**Diagnosis**:
```bash
cd ~/.pi/agent/extensions/ava-agent
ls node_modules/ts-morph  # Should not error
```

**Fix**:
```bash
cd ~/.pi/agent/extensions/ava-agent
npm install
```

### Type Not Exported from 'typebox'

**Symptoms**: Extension fails at startup with import error from `typebox`.

**Diagnosis**:
```bash
cd ~/.pi/agent/extensions/ava-agent
npm ls typebox
# Should show: typebox@1.1.38 or higher
```

**Fix**: Ensure `typebox` (NOT `@sinclair/typebox`) is installed.

### Theme Does Not Appear

**Symptoms**: Theme list does not show `brutalist`.

**Diagnosis**:
```bash
ls ~/.pi/agent/themes/brutalist.json
node -e "JSON.parse(require('fs').readFileSync(require('path').join(process.env.HOME, '.pi/agent/themes/brutalist.json')))"
```

### Skill Does Not Appear

**Symptoms**: `scaffold-ui` not listed in skills.

**Diagnosis**:
```bash
grep "^---" ~/.pi/agent/skills/scaffold-ui/SKILL.md
head -5 ~/.pi/agent/skills/scaffold-ui/SKILL.md
```

## Uninstallation

```bash
# Extension
rm -rf ~/.pi/agent/extensions/ava-agent

# Theme
rm -f ~/.pi/agent/themes/brutalist.json

# Skill
rm -rf ~/.pi/agent/skills/scaffold-ui
```

Restart pi after removal.

## Critical Notes

- `typebox` (NOT `@sinclair/typebox`) is the correct dependency — pi uses `typebox` 1.1.38
- File uses `.js` extension in imports even for `.ts` files (ESM with NodeNext)
- Extension entry point must be `index.ts` at the extension root directory
- Theme requires exactly 51 color tokens to match `theme-schema.json`
- Skill requires YAML frontmatter with `name` and `description` fields
- Dependencies must be installed inside the extension directory, not globally
# User Guide: Installing the AVA Agent Extension

This guide walks you through installing the `ava-agent` extension into a system-installed pi-coding-agent at `~/.pi/agent/extensions/`.

## What AVA Agent Provides

| Component | Description | Discovery Location |
|-----------|-------------|-------------------|
| `audit-ui` tool | Scans TSX files for DOM bloat and banned Tailwind | Loaded via extension API |
| `reflect-session` tool | Extracts architectural decisions from session compactions | Loaded via extension API |
| `/avant-garde` command | Activates strict brutalist mode | Loaded via extension API |
| `ava-brutalist` message renderer | Wraps assistant output in borders | Loaded via extension API |
| `brutalist` theme | 51-token high-contrast monochrome theme | `~/.pi/agent/themes/` |
| `scaffold-ui` skill | Enforces brutalist constraints in generated code | `~/.pi/agent/skills/` |

## Prerequisites Before You Start

| Requirement | Version | How to Verify |\和苏 | What to Do If Missing |
|-------------|---------|------------------------|-------------------|
| Node.js | >=22.19.0 | `node --version` | Install from nodejs.org |
| npm or pnpm | >=10 | `npm --version` | Included with Node.js |
| pi-coding-agent | ^0.78.1 | `pi --version` | `npm install -g @earendil-works/pi-coding-agent` |
| ts-morph | ^28.0.0 | `npm ls ts-morph` in extension dir | Installed in step 3 |

> **Important**: AVA Agent depends on `ts-morph` for AST analysis and `typebox` for parameter schemas. These are installed in the extension directory, not globally. They must be in the same `node_modules` tree as the extension or resolvable by Node.js module resolution.

## Step 1: Locate the Source Extension Archive

Before installing, you need the extension source files. These are typically distributed as a tar.gz, a Git repository, or a directory containing:

```
ava-agent/
  src/
    index.ts              — Extension entry point
    utils/
      ast-auditor.ts
      session-graph.ts
    tools/
      audit-ui.ts
      reflect-session.ts
  themes/
    brutalist.json
  skills/
    scaffold-ui/
      SKILL.md
```

If you do not have the source yet, clone or extract it to a working directory first.

## Step 2: Create the Extension Directory

Create the extension directory under your global pi agent extensions folder:

```bash
mkdir -p ~/.pi/agent/extensions/ava-agent
```

## Step 3: Install Dependencies in the Extension Directory

Create a `package.json` inside `~/.pi/agent/extensions/ava-agent/` with these runtime dependencies:

```json
{
  "name": "ava-agent",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "ts-morph": "^28.0.0",
    "typebox": "^1.1.38"
  }
}
```

Then install the dependencies:

```bash
cd ~/.pi/agent/extensions/ava-agent
npm install
```

Verify that `node_modules/ts-morph/` and `node_modules/typebox/` exist after this step.

## Step 4: Copy Source Files into the Extension Directory

Copy the extension source into the directory:

```bash
# Adjust the source path to where you extracted or cloned the extension
SOURCE_DIR=/path/to/ava-agent

cp -r "$SOURCE_DIR/src" ~/.pi/agent/extensions/ava-agent/
```

Create the entry point file `index.ts` at the extension root:

```bash
cat > ~/.pi/agent/extensions/ava-agent/index.ts << 'EOF'
export { default } from './src/index.js';
EOF
```

Verify the directory structure looks like:

```
~/.pi/agent/extensions/ava-agent/
  index.ts              — Entry point
  package.json
  node_modules/
    ts-morph/
    typebox/
  src/
    index.ts
    utils/
      ast-auditor.ts
      session-graph.ts
    tools/
      audit-ui.ts
      reflect-session.ts
```

## Step 5: Install the Theme

Copy the theme JSON to the global themes directory:

```bash
mkdir -p ~/.pi/agent/themes
cp ~/.pi/agent/extensions/ava-agent/themes/brutalist.json ~/.pi/agent/themes/
```

Verify the theme has 51 tokens:

```bash
node -e "
const theme = require(require('path').join(process.env.HOME, '.pi/agent/themes/brutalist.json'));
const count = Object.keys(theme.colors).length;
console.log('Theme tokens:', count);
console.log(count === 51 ? 'OK' : 'Mismatch');
"
```

## Step 6: Install the Skill

Copy the skill to the global skills directory:

```bash
mkdir -p ~/.pi/agent/skills/scaffold-ui
cp ~/.pi/agent/extensions/ava-agent/skills/scaffold-ui/SKILL.md ~/.pi/agent/skills/scaffold-ui/
```

Verify the file is present:

```bash
ls ~/.pi/agent/skills/scaffold-ui/SKILL.md
```

## Step 7: Verify the Extension is Loadable

Restart pi and check that the extension is recognized:

```bash
pi --help
```

In interactive mode, list available tools. The extension registers:
- `audit-ui`
- `reflect-session`

And the command:
- `/avant-garde`

## Step 8: Quick Verification Test

Create a test TSX file with banned Tailwind classes and run the audit tool:

```bash
# Create a test file
cat > /tmp/test-component.tsx << 'EOF'
export function Bad() {
  return <div className="rounded-lg shadow-md bg-gradient-to-r">Test</div>;
}
EOF

# In a pi session, use the audit-ui tool
# You should see violations detected for rounded-lg, shadow-md, bg-gradient-to-r
```

## Step 9: Optional — Enable TypeScript Type Checking

If you plan to modify the extension, install dev dependencies and type-check:

```bash
cd ~/.pi/agent/extensions/ava-agent
npm install --save-dev typescript @types/node @earendil-works/pi-coding-agent vitest
npx tsc --noEmit
```

## Troubleshooting

### Extension is not loaded at startup

**Symptoms**: No `audit-ui` or `reflect-session` in tool list.

**Diagnosis**:
1. Check that `~/.pi/agent/extensions/ava-agent/index.ts` exists and is readable
2. Check that `pi` loads global extensions (should load from `~/.pi/agent/extensions/` automatically)
3. Check for errors in pi startup output

**Fix**:
```bash
# Force pi to load a specific extension for testing
pi --extension ~/.pi/agent/extensions/ava-agent/index.ts
```

### `Cannot find module 'ts-morph'`

**Symptoms**: Extension fails to load with `ERR_MODULE_NOT_FOUND` for `ts-morph`.

**Diagnosis**: Node.js cannot resolve `ts-morph` from the extension directory. Check that `npm install` was run inside `~/.pi/agent/extensions/ava-agent/` and that `node_modules/ts-morph/` exists.

**Fix**:
```bash
cd ~/.pi/agent/extensions/ava-agent
ls node_modules/ts-morph  # Should not error
npm install  # If missing, install again
```

### Theme does not appear

**Symptoms**: Theme list does not show `brutalist`.

**Diagnosis**: Theme must be in `~/.pi/agent/themes/` directory and be a valid JSON file.

**Fix**:
```bash
ls ~/.pi/agent/themes/brutalist.json
node -e "JSON.parse(require('fs').readFileSync(require('path').join(process.env.HOME, '.pi/agent/themes/brutalist.json')))"
```

### Skill does not appear

**Symptoms**: `scaffold-ui` not listed in skills.

**Diagnosis**: Skill must be in `~/.pi/agent/skills/scaffold-ui/SKILL.md` with valid YAML frontmatter.

**Fix**:
```bash
grep "^---" ~/.pi/agent/skills/scaffold-ui/SKILL.md
head -5 ~/.pi/agent/skills/scaffold-ui/SKILL.md  # Should show frontmatter
```

### `Type` is not exported from `typebox`

**Symptoms**: Extension fails at startup with import error from `typebox`.

**Diagnosis**: The wrong `typebox` might be installed. The extension requires `typebox` (not `@sinclair/typebox`). Check `node_modules/typebox` exists.

**Fix**:
```bash
cd ~/.pi/agent/extensions/ava-agent
npm ls typebox
# Should show: typebox@1.1.38 or higher
```

## Uninstalling

Remove the extension, theme, and skill:

```bash
# Extension
rm -rf ~/.pi/agent/extensions/ava-agent

# Theme
rm -f ~/.pi/agent/themes/brutalist.json

# Skill
rm -rf ~/.pi/agent/skills/scaffold-ui
```

Restart pi after removal.

## Reference: Extension Discovery Order

Pi-coding-agent discovers extensions in this order:

1. Project-local: `cwd/.pi/extensions/*`
2. Global: `~/.pi/agent/extensions/*`
3. Built-in: `builtin/extensions/*`

Each extension is discovered as one of:
- A direct `.ts` or `.js` file: `extensions/*.ts`
- A subdirectory with `index.ts` or `index.js`: `extensions/*/index.ts`
- A subdirectory with `package.json` containing a `pi` field: `extensions/*/package.json`

AVA Agent uses the subdirectory with `index.ts` pattern.
# AVA Agent Extension — Usage Guide

How to use the AVA Agent extension after it has been installed to `~/.pi/agent/extensions/ava-agent/`.

---

## Table of Contents

1. [Activating the Extension](#activating-the-extension)
2. [Using the `audit-ui` Tool](#using-the-audit-ui-tool)
3. [Using the `reflect-session` Tool](#using-the-reflect-session-tool)
4. [Using the `/avant-garde` Command](#using-the-avant-garde-command)
5. [Using the `brutalist` Theme](#using-the-brutalist-theme)
6. [Using the `scaffold-ui` Skill](#using-the-scaffold-ui-skill)
7. [Workflow: Complete Brutalist Design Session](#workflow-complete-brutalist-design-session)
8. [Troubleshooting](#troubleshooting)

---

## Activating the Extension

The AVA Agent extension auto-loads when pi starts because it was installed to the global extensions directory (`~/.pi/agent/extensions/ava-agent/`).

### Verify It Loaded

In an interactive pi session, ask:

```
> List your available tools
```

You should see `audit-ui` and `reflect-session` in the response.

### Force-Load for a Single Session

If the extension is not loading (e.g., for testing a specific path):

```bash
pi --extension ~/.pi/agent/extensions/ava-agent/index.ts
```

Or in a specific project directory:

```bash
cd /path/to/my-project
pi --extension ~/.pi/agent/extensions/ava-agent/index.ts
```

---

## Using the `audit-ui` Tool

### Purpose
Scans a React/TSX file for:
- JSX nesting depth > 4 layers
- Banned Tailwind classes: `rounded-*`, `shadow-*`, `bg-gradient-*`

### How to Invoke

In an interactive pi session, ask naturally:

```
> Audit this file for me: src/components/Button.tsx
```

Or explicitly:

```
> Use the audit-ui tool to scan src/components/Button.tsx
```

### What to Expect

**If compliant**:
```
COMPLIANT: DOM depth is optimal. No generic aesthetic slop detected.
```

**If violations found**:
```
VIOLATIONS DETECTED:

[CRITICAL] Line 1: Class "rounded-lg" violates brutalist design rules.
  Suggestion: Use flat, high-contrast primitives like border-2, bg-zinc-950.

[CRITICAL] Line 1: Class "shadow-md" violates brutalist design rules.
  Suggestion: Use flat, high-contrast primitives like border-2, bg-zinc-950.

You must refactor this component immediately.
```

### Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `targetPath` | Relative path to the TSX file within the workspace | `src/components/Card.tsx` |

### Security Note

The tool blocks path traversal. These will throw a security error:

```
> Audit: ../../etc/passwd
```

Response:
```
SECURITY VIOLATION: Path traversal detected. ../../etc/passwd is outside workspace.
```

---

## Using the `reflect-session` Tool

### Purpose
Analyzes a pi session's JSONL file to extract past Architectural Decision Records (ADRs) from compaction events. Useful when continuing a long-running project and needing to recall past constraints.

### How to Invoke

In an interactive pi session:

```
> Reflect on my session history: /home/pi/sessions/project_abc123.jsonl
```

Or explicitly:

```
> Use the reflect-session tool with sessionFile=/home/pi/sessions/project_abc123.jsonl and leafId=comp1
```

### What to Expect

```
# ARCHITECTURAL DECISION RECORDS

### 2025-01-01T00:00:02.000Z
Summary: # Constraints - Use TypeScript strict - No any...
Constraints: Use TypeScript strict, No any
Decisions: Use vitest for testing, Extension-only architecture
```

If no ADRs exist:
```
No historical architectural decisions found in this branch.
```

### Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `sessionFile` | Absolute path to the session_id.jsonl file | `/home/pi/sessions/project_abc123.jsonl` |
| `leafId` | The ID of the current leaf node to trace back from | `comp1` (or leave empty for full trace) |

### Finding the Session File

Session files are stored at:

```
~/.pi/agent/sessions/[session-name]_[id].jsonl
```

Or you can use pi's built-in session manager to find the current session file path.

---

## Using the `/avant-garde` Command

### Purpose
Activates strict brutalist design mode. This command signals to the assistant that all generated components must adhere to brutalist constraints.

### How to Invoke

In an interactive pi session, type exactly:

```
> /avant-garde
```

### What Happens

You will see a confirmation:
```
STRICT AVANT-GARDE MODE activated
```

After this, every generated component will follow:
- No `rounded-*` classes
- No `shadow-*` classes
- No `bg-gradient-*` classes
- Maximum JSX nesting depth of 4 layers

### Resetting the Mode

The mode is session-scoped. To deactivate, start a new pi session or restart pi.

---

## Using the `brutalist` Theme

### Purpose
A 51-token high-contrast monochrome theme for pi's interactive mode. Dark background, white text, no rounded corners, no shadows.

### How to Activate

In an interactive pi session:

```
> /theme brutalist
```

Or pass it as a CLI flag:

```bash
pi --theme ~/.pi/agent/themes/brutalist.json
```

### What It Looks Like

```
┌─ AVA OUTPUT ────────────────────────────────────────
COMPLIANT: DOM depth is optimal. No generic 
  aesthetic slop detected.
└──────────────────────────────────────────────────────
```

Colors:
- Background: `#000000` (pure black)
- Text: `#ffffff` (white)
- Border: `#333333` (dark gray)
- Success: `#00ff00` (bright green)
- Error: `#ff0000` (bright red)
- Warning: `#ffff00` (bright yellow)

### Deactivating

```
> /theme default
```

Or restart pi without the `--theme` flag.

---

## Using the `scaffold-ui` Skill

### Purpose
A pi skill that enforces brutalist design constraints when generating React components. It is automatically active when pi loads.

### How It Works

The skill is loaded from `~/.pi/agent/skills/scaffold-ui/SKILL.md`. When you ask pi to generate a component, the skill constrains the output:

```
> Generate a login form component
```

The assistant will produce a component following these rules:
1. Stark high-contrast Tailwind classes (`bg-zinc-950`, `text-zinc-50`, `border-2`, `border-white`)
2. No `rounded-*`, `shadow-*`, or `bg-gradient-*`
3. JSX nesting depth <= 4 layers
4. Extract sub-components as needed
5. **Mandatory**: Before writing to disk, the `audit-ui` tool is invoked. If it returns violations, the assistant must refactor and re-audit until it passes.

### What to Expect

A typical generated component:

```typescript
export function LoginForm() {
  return (
    <div className="bg-zinc-950 text-zinc-50 border-2 border-white p-4 max-w-md">
      <h1 className="text-xl font-bold mb-4">Login</h1>
      <form>
        <input className="bg-black border border-white text-white px-3 py-2 w-full" type="email" placeholder="Email" />
        <input className="bg-black border border-white text-white px-3 py-2 w-full" type="password" placeholder="Password" />
        <button className="bg-zinc-50 text-black px-4 py-2 w-full mt-4">Login</button>
      </form>
    </div>
  );
}
```

### Why the Skill Exists

Without the skill, pi's default behavior might generate components with generic AI slop — rounded corners, shadows, gradients. The skill overrides this with strict brutalist constraints.

---

## Workflow: Complete Brutalist Design Session

A step-by-step workflow for a complete design session:

### Step 1: Start Pi with the Brutalist Theme

```bash
pi --theme ~/.pi/agent/themes/brutalist.json
```

### Step 2: Activate Strict Mode

```
> /avant-garde
STRICT AVANT-GARDE MODE activated
```

### Step 3: Generate a Component

```
> Generate a todo list component with add, complete, and delete functionality.
```

Pi will generate the component using the `scaffold-ui` skill constraints.

### Step 4: Audit the Generated Component

```
> Use audit-ui on the file you just created
```

If violations exist, pi will refactor and re-audit until compliant.

### Step 5: Review Past Decisions (if continuing a project)

```
> Reflect on my session history
```

Pi will trace the session graph and surface past ADRs.

---

## Troubleshooting

### Tool Not Found

**Symptoms**: `audit-ui` or `reflect-session` is not recognized.

**Diagnosis**:
1. Check if the extension loaded: `pi --help` should not error
2. Check if `~/.pi/agent/extensions/ava-agent/index.ts` exists
3. Restart pi

**Fix**:
```bash
# Verify the extension file exists and is readable
ls -la ~/.pi/agent/extensions/ava-agent/index.ts

# Restart pi explicitly with the extension
pi --extension ~/.pi/agent/extensions/ava-agent/index.ts
```

### Theme Not Applied

**Symptoms**: Output still uses the default theme, not brutalist.

**Diagnosis**:
```
> /theme brutalist
```

**Fix**: Load the theme with the full path:
```bash
pi --theme ~/.pi/agent/themes/brutalist.json
```

Or activate in-session:
```
> /theme brutalist
```

### Command Not Found

**Symptoms**: `/avant-garde` is not recognized.

**Diagnosis**: The extension registers commands via the ExtensionAPI. If the extension is not loaded, the command will not be available.

**Fix**: Ensure the extension is loaded. Check the extension directory and restart pi.

### Audio-ui Tool Returns No Violations for Bad Code

**Symptoms**: A component with `rounded-lg` is reported as compliant.

**Diagnosis**: The `audit-ui` tool scans for banned classes in `className` JSX attributes. If the class is applied dynamically (e.g., via `clsx()` or string interpolation), the tool might not detect it.

**Fix**: Use string literals in `className` for the tool to detect. Or manually inspect the code.

### Reflect Session Tool Fails with "No such file"

**Symptoms**: `reflect-session` cannot find the session file.

**Diagnosis**: The tool requires the absolute path to the session JSONL file.

**Fix**: Find the session file:
```bash
ls ~/.pi/agent/sessions/*.jsonl
```

Then pass the full path.

---

## Quick Reference

| Feature | Invocation | Parameters |
|---------|-----------|-----------|
| `audit-ui` | `Use the audit-ui tool to scan {path}` | `targetPath`: relative path to TSX |
| `reflect-session` | `Reflect on my session history` or explicit | `sessionFile`, `leafId` |
| `/avant-garde` | Type exactly `/avant-garde` | None |
| `brutalist` theme | `/theme brutalist` or `--theme brutalist.json` | None |
| `scaffold-ui` skill | Automatic when asking to generate components | None |

---

## See Also

- Installation Guide: `skills/ava-agent-installation/SKILL.md`
- Extension Code: `~/.pi/agent/extensions/ava-agent/src/`
- README: `~/.pi/agent/extensions/ava-agent/README.md`

Skill Delivered: custom-pi-agent  
  
Location: /home/project/pi-agent/packages/coding-agent/skills/custom-pi-agent/  
  
### File Structure  
  
```  
  skills/custom-pi-agent/  
  ├── SKILL.md                           (140 lines, 9.5KB)  
  └── references/  
      ├── api-reference.md               (225 lines, 9.3KB)  
      ├── testing-patterns.md            (238 lines, 8.3KB)  
      └── validation-guide.md            (149 lines, 6.2KB)  
```  
  
### What Each File Covers  
  
┌────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐ 
│ File                           │ Content                                                                                                                                                                                               │ 
├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ SKILL.md                       │ Core methodology — 4-phase workflow (Investigate, Validate, Correct, Plan TDD), Pi extension API summary, session JSONL format, theme requirements, 7 key principles                                  │ 
├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ references/api-reference.md    │ Complete Pi ExtensionAPI surface (event subscriptions, tool/command/flag registration, actions), ToolDefinition with all optional fields, ExtensionContext/ExtensionCommandContext fields,            │ 
│                                │ ContextEvent/SessionBeforeCompactEvent, AgentToolResult, session entry types, 50 theme tokens, dependency check                                                                                       │ 
├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ references/testing-patterns.md │ TDD patterns with code: MockExtensionContext factory, MockExtensionAPI factory, AST auditor tests with ts-morph, session graph tests with inline JSONL fixtures, tool wrapper tests with vi.mock(),   │ 
│                                │ extension engine tests with vi.fn(), fixture management, run commands, coverage goals                                                                                                                 │ 
├────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
│ references/validation-guide.md │ Step-by-step blueprint validation methodology: 5 phases with checklist, verification categories (CRITICAL/MODERATE/INFO), grep patterns for source cross-referencing, evidence chain format, common   │ 
│                                │ regression bugs, 21-item checklist template                                                                                                                                                           │ 
└────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘ 
  
### Skill Creator Compliance  
  
┌────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┐  
│ Requirement                                                        │ Status                                                                  │  
├────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ SKILL.md under 250 lines                                           │ 140 lines                                                               │  
├────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ Each reference under 250 lines                                     │ 225, 238, 149                                                           │  
├────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ YAML frontmatter with name + description                           │ Valid                                                                   │  
├────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ Progressive disclosure (summary in SKILL.md, detail in references) │ 3 reference files                                                       │  
├────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ Imperative/infinitive form                                         │ Workflow instructions use imperative                                    │  
├────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ Third-person description                                           │ "Use when..." structure in frontmatter                                  │  
├────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┤  
│ Triggers listed in description                                     │ "build pi extension", "validate pi blueprint", "plan pi implementation" │  
└────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┘  


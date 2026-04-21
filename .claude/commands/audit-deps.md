# Dependency audit with dep-scope

Analyze project dependencies with `dep-scope` to identify optimization opportunities.

## Instructions

### 1. Run the scan

```bash
dep-scope scan
```

If sources are outside `./src`:
```bash
dep-scope scan -s ./src ./app ./lib
```

### 2. Interpret verdicts

| Verdict | Action |
|---------|--------|
| ✗ REMOVE | Remove (check: dynamic import? CSS? config file?) |
| ⊕ PEER_DEP | Remove from package.json (will stay via peer deps) |
| ↻ RECODE_NATIVE | Migrate to native JS (`uuid.v4` → `crypto.randomUUID()`) |
| ⇄ CONSOLIDATE | Merge duplicates (keep the most-used lib) |
| ? INVESTIGATE | Review manually |
| ✓ KEEP | No action needed |

### 3. Generate migration prompts

For RECODE_NATIVE or CONSOLIDATE packages:
```bash
dep-scope migrate             # auto-detect all candidates
dep-scope migrate <package>   # target one package
```

Each command writes `.dep-scope/migrate-<pkg>.md` — pipe directly into Claude Code:
```bash
claude -p "$(cat .dep-scope/migrate-lodash.md)"
```

### 4. Produce the audit report

Structure:

```markdown
## Dependency Audit - [Project]

### Summary
- Total: X deps | Actionable: Y | Estimated savings: ~ZKB

### Quick Wins (< 30 min)
- [ ] `npm uninstall pkg` - reason

### Recommended Migrations
- [ ] pkg → alternative - estimated effort

### Consolidations (duplicates)
- [ ] Category: keep X, migrate Y/Z

### To Investigate
- [ ] pkg - what to check

### False Positives (to ignore)
- pkg - used in config/runtime/CSS
```

### 5. Action plan

**Phase 1 - Quick Wins**: Safe removals, peer deps  
**Phase 2 - Simple Migrations**: uuid→native, classnames→clsx  
**Phase 3 - Refactoring**: Icon consolidation, axios→fetch

### Known Limitations

Not detected: `@import` CSS, config file references (tailwind, babel, eslint plugins).  
Dynamic imports (`await import()`) and `require()` ARE detected.
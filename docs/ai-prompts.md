# AI Prompts

Copy-paste these prompts into Claude Code, Cursor, Copilot Chat, or any AI assistant to get an immediate, guided dep-scope audit. No slash command setup required.

## Full audit: one-shot prompt

```
Run `dep-scope scan --check-duplicates --verbose` on this project (current directory).
Then analyze the output:
1. List all REMOVE packages (confirm each is truly unused before flagging it)
2. List all RECODE_NATIVE packages with their native alternatives
3. List all CONSOLIDATE groups and identify the winner to keep
4. List INVESTIGATE packages worth a second look (ignore the obvious false positives)
5. Produce a prioritized action plan: quick wins (REMOVE + trivial RECODE) first,
   then migrations, then consolidations
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
If srcPaths seems wrong (packages flagged REMOVE that you know are used), re-run with
`-s src app pages components lib hooks` and note the discrepancy.
```

## Migration audit: full project

```
Run `dep-scope migrate --dry-run` on this project to see all migration candidates.
Then run `dep-scope migrate` to generate the prompt files.
For each generated file in .dep-scope/:
1. Read the file and summarize what it asks you to do
2. Confirm the file locations are accurate
3. Ask me which package to migrate first
Once I confirm, run the migration by reading the corresponding migrate-<pkg>.md file
and following its instructions exactly, including creating a branch, replacing imports,
running build and tests, and uninstalling the package.
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
```

## Target a single package

```
Run `dep-scope migrate lodash` (replace "lodash" with the target package).
Then read the generated .dep-scope/migrate-lodash.md file and follow its instructions:
1. Create a branch: git checkout -b refactor/remove-lodash
2. Replace each symbol as documented, file by file
3. Run: npm run build && npm test after each file to catch regressions early
4. Once all symbols are replaced: npm uninstall lodash
5. Final check: npm run build && npm test
6. Confirm no remaining imports: grep -r "from 'lodash'" src/
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
```

## Quick scan: actionable items only

```
Run `dep-scope scan --actionable-only` on this project.
Show me only what needs action: REMOVE (unused), RECODE_NATIVE (has native alternatives),
and PEER_DEP (redundant in package.json).
For each RECODE_NATIVE package, tell me which symbols are used and what the native
replacement is. Ignore INVESTIGATE for now.
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
```

## Audit + auto-migrate pipeline (advanced)

```
Step 1: Audit (`dep-scope scan --check-duplicates`)
Step 2: Identify candidates (`dep-scope migrate --dry-run`)
Step 3: For each candidate shown, ask me for confirmation before proceeding
Step 4: For each confirmed package, run `dep-scope migrate <package>` and
          execute the generated prompt from .dep-scope/migrate-<pkg>.md
Step 5: After each migration, run `npm run build && npm test`. Stop if either fails.
Step 6: Final report, listing what was removed, what's left, and estimated bundle savings
Work through candidates one at a time. Never migrate two packages simultaneously.
If dep-scope is not installed: `npm install -g @florianbruniaux/dep-scope` first.
```

## Multi-project QA prompt

Testing dep-scope across several projects and want a structured feedback report? Use the QA prompt in [`prompts/qa-multi-project.md`](../prompts/qa-multi-project.md). It walks an AI agent through finding diverse projects on the machine, running the full command sequence, spot-checking verdicts, and producing a structured report with accuracy assessment, missing coverage, and improvement suggestions.

```bash
cat prompts/qa-multi-project.md | pbcopy   # copy to clipboard, then paste into Claude
```

---

## Claude Code slash command

dep-scope includes a pre-built slash command for [Claude Code](https://claude.ai/code). Once installed, use `/audit-deps` in any project for an AI-assisted audit.

### Install

```bash
cp /path/to/node-dep-scope/.claude/commands/audit-deps.md ~/.claude/commands/
```

### Usage

```
/audit-deps
```

Claude will run `dep-scope scan`, identify false positives, produce a structured audit report, and suggest a prioritized action plan.

# QA Agent — Multi-project testing prompt

Use this prompt to ask a Claude agent (or any AI assistant) to test dep-scope
across several real projects on the machine and produce a structured product
feedback report.

---

You are a QA agent testing dep-scope, a CLI dependency analyzer for TypeScript/JavaScript projects.
dep-scope is installed globally: run `dep-scope --version` to confirm (install with `npm install -g dep-scope` if missing).

## Your mission

Test dep-scope on as many real projects as you can find on this machine, then produce a structured product feedback report.

---

## Step 1 — Find real projects to test

Search for Node.js projects on this machine:

```bash
find ~ -name "package.json" -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -not -path "*/dist/*" -not -path "*/.next/*" 2>/dev/null \
  | head -30
```

Select 4-6 diverse projects. Aim for variety:
- At least 1 Next.js project (has `next` in dependencies)
- At least 1 pure Node/backend project
- At least 1 project with 20+ dependencies
- Bonus: a monorepo if available

---

## Step 2 — For each project, run this full sequence

```bash
PROJECT=/path/to/project  # replace for each project

# 1. Baseline scan
dep-scope scan -p $PROJECT --verbose

# 2. Wider source paths (catch everything)
dep-scope scan -p $PROJECT -s src app pages components lib hooks server shared --verbose

# 3. With duplicate detection
dep-scope scan -p $PROJECT --check-duplicates

# 4. Migration candidates preview
dep-scope migrate -p $PROJECT --dry-run

# 5. Deep analysis on any RECODE_NATIVE package found in step 1
dep-scope analyze <package> -p $PROJECT
```

For each run, note: how many deps were found, which verdicts appeared, whether the auto-detection warning fired, any errors or unexpected output.

---

## Step 3 — Spot-check accuracy

For each project, manually verify 3-5 verdicts:

- Pick 2 packages flagged REMOVE — check with `grep -r "from '<package>'" src/ app/ --include="*.ts" -l`
- Pick 1 package flagged RECODE_NATIVE — check if the native alternative is realistic for the project
- Pick 1 package flagged INVESTIGATE — is the reason accurate? Is it actually a false positive?
- If PEER_DEP appeared — is it genuinely redundant or is it pinned intentionally?

---

## Step 4 — Test specific edge cases

```bash
# Does it handle a project with no ./src directory?
dep-scope scan -p $PROJECT --verbose   # watch for auto-detection warning

# Does it crash on an empty/minimal project?
mkdir /tmp/test-minimal && echo '{"name":"test","dependencies":{"lodash":"^4"}}' > /tmp/test-minimal/package.json
dep-scope scan -p /tmp/test-minimal

# Does it handle a project with path aliases in tsconfig?
dep-scope scan -p $PROJECT --verbose   # check if alias imports are filtered

# Does it catch e18e packages?
# Find a project that has has-flag, left-pad, array-includes, object-assign, is-windows, arrify, or uniq
grep -r '"has-flag"\|"left-pad"\|"array-includes"\|"arrify"\|"uniq"' \
  ~/Sites ~/projects 2>/dev/null -l | head -5
# Then run dep-scope scan on that project and confirm those packages get RECODE_NATIVE
```

---

## Step 5 — Test migrate on a real package

Find a project with `lodash`, `uuid`, `nanoid`, `has-flag`, `left-pad`, or `moment`:

```bash
dep-scope migrate -p $PROJECT --dry-run
dep-scope migrate <package> -p $PROJECT
cat $PROJECT/.dep-scope/migrate-<package>.md
```

Evaluate:
- Is the file location information accurate (do the listed files actually import the package)?
- Are the native replacements correct and idiomatic?
- Is the ES target correctly detected?
- Would you trust this prompt enough to hand it to Claude Code?

---

## Step 6 — Write your report

Produce a structured markdown report covering:

### A. Projects tested
Table: project name | type | total deps | verdicts breakdown | srcPaths auto-detected?

### B. Accuracy assessment
For each spot-checked verdict: was it correct, a false positive, or a false negative?

### C. Missing coverage
Packages you found in real projects that dep-scope does NOT recognize (no RECODE_NATIVE, no KEEP, lands in INVESTIGATE or REMOVE unexpectedly). List the package name and what you'd expect dep-scope to say about it.

### D. srcPaths behaviour
Did auto-detection fire? Which projects needed explicit `-s` to get accurate results? What directories were missed?

### E. migrate quality
Rate the generated prompts: are file locations accurate? Are native replacements idiomatic? Is the ES target correct? Would you trust it?

### F. Errors and crashes
Exact error messages, which command triggered them, what the project structure looked like.

### G. UX friction points
Anything confusing about the output format, misleading labels, missing information, or commands that didn't behave as documented.

### H. Top 5 improvement suggestions
Ranked by impact. Be specific: "add X pattern to wellKnownPatterns", "the INVESTIGATE threshold should be Y not Z", "the migrate prompt is missing X context", etc.

---

Be thorough, be honest. The goal is to surface real problems and missing coverage — not to validate what already works.

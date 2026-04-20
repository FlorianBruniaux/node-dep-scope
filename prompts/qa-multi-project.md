# QA Agent — Multi-project testing prompt

Use this prompt to ask a Claude agent (or any AI assistant) to test dep-scope
across several real projects on the machine and produce a structured product
feedback report.

---

You are a QA agent testing **dep-scope v0.2.0**, a CLI dependency analyzer for TypeScript/JavaScript projects.

Confirm it is installed and at the right version:

```bash
dep-scope --version   # expected: 0.2.0
# If missing or outdated: npm install -g dep-scope
```

## Your mission

Test dep-scope on as many real projects as you can find on this machine, then produce a structured product feedback report. Be adversarial — your job is to find gaps, not to validate what works.

---

## Step 1 — Find real projects to test

```bash
find ~ -name "package.json" -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -not -path "*/dist/*" -not -path "*/.next/*" 2>/dev/null \
  | head -40
```

Select 4-6 diverse projects. Aim for variety:
- At least 1 Next.js project (`next` in dependencies)
- At least 1 pure Node/backend project
- At least 1 project with 20+ dependencies
- At least 1 project that uses a barrel/index file pattern (re-exports from other packages)
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

- **REMOVE verdicts**: check if the package is genuinely absent from all source files. Also check if it might be re-exported from a barrel file (e.g. `src/utils/index.ts` doing `export { x } from 'pkg'`). A package re-exported via barrel should NOT be flagged REMOVE.
- **RECODE_NATIVE verdicts**: check if the native alternative shown is realistic. For `uuid`/`nanoid` → note whether the caveat about HTTPS secure context appears. For `axios` → check that the caveats mention `res.ok` check and the lack of interceptors.
- **INVESTIGATE verdicts**: is the reason accurate? Check if it's a genuine false positive.
- **CSS/font packages**: if the project has `normalize.css`, `reset-css`, `@fontsource/*` or similar — confirm they are flagged IGNORE, not REMOVE.

```bash
# Check for barrel re-exports manually (to validate dep-scope's verdict)
grep -r "export.*from" src/ app/ lib/ --include="*.ts" --include="*.tsx" -l
# Then look at those files — if they re-export from an npm package, dep-scope should count it as used
```

---

## Step 4 — Test specific edge cases

```bash
# Edge case 1: barrel file re-exports
# Create a test project where a package is ONLY used via barrel re-export
mkdir /tmp/test-barrel && cd /tmp/test-barrel
cat > package.json << 'EOF'
{"name":"test-barrel","dependencies":{"date-fns":"^3","lodash":"^4"}}
EOF
mkdir -p src utils
# Barrel file — re-exports from date-fns
echo 'export { format, parse } from "date-fns";' > utils/dates.ts
# Consumer — imports from the barrel, not directly from date-fns
echo 'import { format } from "../utils/dates";' > src/index.ts
dep-scope scan -p /tmp/test-barrel -s src utils --verbose
# Expected: date-fns should NOT be flagged REMOVE (it's used via barrel)
# Expected: lodash SHOULD be flagged REMOVE (genuinely unused)

# Edge case 2: minimal project (no src dir)
mkdir /tmp/test-minimal
echo '{"name":"test","dependencies":{"lodash":"^4"}}' > /tmp/test-minimal/package.json
dep-scope scan -p /tmp/test-minimal
# Expected: should not crash, should print auto-detection warning

# Edge case 3: e18e packages
# Find a project that has has-flag, left-pad, array-includes, or similar
grep -r '"has-flag"\|"left-pad"\|"array-includes"\|"arrify"\|"is-windows"' \
  ~/Sites ~/projects 2>/dev/null | grep '"dependencies"' -A 20 | head -10
# Then: dep-scope scan -p $PROJECT → confirm those packages get RECODE_NATIVE

# Edge case 4: CSS reset / font packages
# If a project imports normalize.css or @fontsource/*
grep -r "normalize.css\|reset-css\|@fontsource" ~/Sites ~/projects 2>/dev/null \
  --include="*.ts" --include="*.tsx" --include="*.css" -l | head -5
# Then: dep-scope scan → confirm they are IGNORE, not REMOVE
```

---

## Step 5 — Test migrate on a real package

Find a project with `lodash`, `uuid`, `nanoid`, `axios`, `moment`, or an e18e package:

```bash
dep-scope migrate -p $PROJECT --dry-run
dep-scope migrate <package> -p $PROJECT
cat $PROJECT/.dep-scope/migrate-<package>.md
```

Evaluate:
- Are the file locations accurate — do the listed files actually import the package?
- For `uuid` or `nanoid`: does the generated prompt mention the HTTPS secure context requirement?
- For `axios`: does the prompt mention checking `res.ok` and the lack of interceptors?
- For `lodash.cloneDeep`: does the prompt mention the prototype loss on class instances?
- Is the ES target correctly detected from tsconfig?
- Would you trust this prompt enough to hand it to Claude Code without editing it?

---

## Step 6 — Write your report

Produce a structured markdown report covering:

### A. Projects tested
Table: project name | type | total deps | verdicts breakdown | srcPaths auto-detected?

### B. Accuracy assessment
For each spot-checked verdict: correct / false positive / false negative. Include the package name and the verdict dep-scope gave.

### C. Barrel file handling
Did dep-scope correctly count packages that are only used via barrel re-exports? Any false REMOVE on a package that was re-exported from an index file?

### D. Missing coverage
Packages you found in real projects that dep-scope does NOT recognize correctly. List: package name | actual verdict | expected verdict | why.

### E. Caveats quality
For `uuid`, `nanoid`, `axios`, `lodash.cloneDeep`: are the caveats in the migrate prompt complete and accurate for the project's actual usage pattern?

### F. srcPaths behaviour
Did auto-detection fire? Which projects needed explicit `-s` to get accurate results? What directories were missed?

### G. migrate quality
Rate the generated prompts: are file locations accurate? Are native replacements idiomatic? Is the ES target correct? Would you trust it?

### H. Errors and crashes
Exact error messages, which command triggered them, what the project structure looked like.

### I. UX friction points
Anything confusing about the output format, misleading labels, missing information, or commands that didn't behave as documented.

### J. Top 5 improvement suggestions
Ranked by impact. Be specific: "add X pattern to wellKnownPatterns", "the INVESTIGATE threshold should be Y not Z", "the migrate prompt is missing X context", etc.

---

Be thorough, be honest. The goal is to surface real problems and missing coverage — not to validate what already works.

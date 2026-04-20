#!/usr/bin/env node

/**
 * dep-scope CLI
 * Analyze granular dependency usage in TypeScript/JavaScript projects
 */

import { program } from "commander";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { UsageAnalyzer } from "../analyzers/usage-analyzer.js";
import { detectDuplicates } from "../rules/duplicate-categories.js";
import { consoleReporter } from "../reporters/console-reporter.js";
import { markdownReporter } from "../reporters/markdown-reporter.js";
import { loadConfig, resolveConfig, type DepScopeConfig } from "../config/index.js";
import {
  formatError,
  isDepScopeError,
  InvalidOptionError,
  ProjectNotFoundError,
} from "../errors/index.js";
import { isKnipAvailable } from "../integrations/knip.js";
import type { ScanResult } from "../types/index.js";
import { generateMigration, getOrBuildTemplate } from "../migration/index.js";
import { resolveTsConfig } from "../utils/tsconfig-resolver.js";
import { resolveSrcPaths } from "../utils/src-paths-resolver.js";
import { detectPackageManager } from "../utils/package-manager-detector.js";
import type { MigrationContext } from "../migration/types.js";

const VERSION = "0.2.0";

const VALID_FORMATS = ["console", "markdown", "json"] as const;
type Format = (typeof VALID_FORMATS)[number];

// Exit codes for CI integration
const EXIT_ISSUES_FOUND = 1;
const EXIT_ERROR = 2;

// ═══════════════════════════════════════════
// Validation helpers
// ═══════════════════════════════════════════

async function validateProjectPath(projectPath: string): Promise<string> {
  const resolved = path.resolve(projectPath);

  try {
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      throw new ProjectNotFoundError(resolved);
    }
  } catch (error) {
    if (isDepScopeError(error)) throw error;
    throw new ProjectNotFoundError(resolved);
  }

  return resolved;
}

function validateFormat(format: string): Format {
  if (!VALID_FORMATS.includes(format as Format)) {
    throw new InvalidOptionError("format", format, [...VALID_FORMATS]);
  }
  return format as Format;
}

function validateThreshold(threshold: string): number {
  const num = parseInt(threshold, 10);
  if (isNaN(num) || num < 1 || num > 100) {
    throw new InvalidOptionError(
      "threshold",
      threshold,
      ["1-100 (number)"]
    );
  }
  return num;
}

function handleError(error: unknown): never {
  console.error(formatError(error));

  if (isDepScopeError(error)) {
    // Provide helpful hints for common errors
    switch (error.code) {
      case "PACKAGE_JSON_NOT_FOUND":
        console.error("\nHint: Make sure you're in a Node.js project directory.");
        break;
      case "SOURCE_PATH_NOT_FOUND":
        console.error("\nHint: Use --src to specify your source directories.");
        break;
      case "PACKAGE_NOT_FOUND":
        console.error("\nHint: Check that the package is listed in dependencies or devDependencies.");
        break;
    }
  }

  process.exit(EXIT_ERROR);
}

/**
 * Build a UsageAnalyzer with src paths auto-resolved.
 * If no configured paths exist on disk, auto-detects common directories.
 */
function buildAnalyzer(
  config: ReturnType<typeof resolveConfig>,
  projectPath: string,
  framework?: string
): UsageAnalyzer {
  const srcPaths = resolveSrcPaths(projectPath, config.srcPaths, framework);
  return new UsageAnalyzer({
    srcPaths,
    threshold: config.threshold,
    includeDev: config.includeDev ?? false,
    ignore: config.ignore,
    verbose: config.verbose ?? false,
    wellKnownPatterns: config.wellKnownPatterns,
    nativeAlternatives: config.nativeAlternatives,
    duplicateCategories: config.duplicateCategories,
  });
}

/**
 * Determine if there are actionable issues in the scan result
 * Note: duplicates only count if --check-duplicates was used
 */
function hasActionableIssues(result: ScanResult, checkDuplicates: boolean): boolean {
  // Issues = REMOVE, RECODE_NATIVE, PEER_DEP, or duplicates (if checked)
  return (
    result.summary.remove > 0 ||
    result.summary.recodeNative > 0 ||
    result.summary.peerDep > 0 ||
    (checkDuplicates && result.duplicates.length > 0)
  );
}

// ═══════════════════════════════════════════
// Program setup
// ═══════════════════════════════════════════

program
  .name("dep-scope")
  .description("Analyze granular dependency usage in TypeScript/JavaScript projects")
  .version(VERSION);

// ═══════════════════════════════════════════
// scan command
// ═══════════════════════════════════════════

program
  .command("scan")
  .description("Scan all dependencies in the project")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-s, --src <paths...>", "Source directories")
  .option("-t, --threshold <n>", "Symbol threshold for RECODE verdict")
  .option("-d, --include-dev", "Include devDependencies")
  .option("-f, --format <type>", "Output format: console, markdown, json")
  .option("-o, --output <file>", "Output file path")
  .option("-v, --verbose", "Verbose output")
  .option("--ignore <packages...>", "Packages to ignore")
  .option("--with-knip", "Use Knip for pre-analysis (auto-detected by default)")
  .option("--no-knip", "Disable Knip integration even if available")
  .option("--actionable-only", "Show only actionable items (hide INVESTIGATE)")
  .option("--check-duplicates", "Check for duplicate libraries (off by default)")
  .option("--no-config", "Ignore config file")
  .option("--no-exit-code", "Always exit with code 0 (for CI debugging)")
  .option("--no-auto-detect", "Disable monorepo workspace auto-detection")
  .action(async (options) => {
    try {
      const projectPath = await validateProjectPath(options.path);

      // Load config file
      const fileConfig = options.config !== false ? await loadConfig(projectPath) : null;

      // Merge CLI options with config (CLI takes precedence)
      const cliOptions: Partial<DepScopeConfig> = {
        ...(options.src && { srcPaths: options.src }),
        ...(options.threshold && { threshold: validateThreshold(options.threshold) }),
        ...(options.includeDev !== undefined && { includeDev: options.includeDev }),
        ...(options.ignore && { ignore: options.ignore }),
        ...(options.verbose !== undefined && { verbose: options.verbose }),
        ...(options.format && { format: validateFormat(options.format) }),
        ...(options.output && { output: options.output }),
      };

      // Resolve config with presets and defaults
      const config = resolveConfig(cliOptions, fileConfig);

      // Knip auto-detection logic:
      // - --no-knip explicitly disables
      // - --with-knip explicitly enables
      // - Default: auto-detect if Knip is available in project
      let withKnip: boolean;
      if (options.knip === false) {
        // --no-knip used
        withKnip = false;
      } else if (options.withKnip === true) {
        // --with-knip explicitly used
        withKnip = true;
      } else {
        // Auto-detect: use Knip if available
        withKnip = isKnipAvailable(projectPath);
      }

      // autoDetect is false when --no-auto-detect is used
      const autoDetectWorkspace = options.autoDetect !== false;

      const srcPaths = resolveSrcPaths(projectPath, config.srcPaths);
      const analyzer = new UsageAnalyzer({
        srcPaths,
        threshold: config.threshold,
        fileCountThreshold: config.fileCountThreshold,
        includeDev: config.includeDev,
        ignore: config.ignore,
        verbose: config.verbose,
        withKnip,
        autoDetectWorkspace,
        wellKnownPatterns: config.wellKnownPatterns,
        nativeAlternatives: config.nativeAlternatives,
        duplicateCategories: config.duplicateCategories,
      });

      const format = config.format ?? "console";
      const output = config.output ?? options.output;

      if (config.verbose) {
        console.log(`Scanning project at ${projectPath}...`);
        if (fileConfig) {
          console.log("Using config file.");
        }
        if (withKnip) {
          const knipMode = options.withKnip === true
            ? "(explicit)"
            : "(auto-detected)";
          console.log(`Knip integration enabled ${knipMode}.`);
        } else if (options.knip === false) {
          console.log("Knip integration disabled (--no-knip).");
        }
        if (options.checkDuplicates) {
          console.log("Duplicate detection enabled.");
        }
      }

      const dependencies = await analyzer.scanProject(projectPath);
      // Duplicate detection is opt-in (use --check-duplicates or `dep-scope duplicates`)
      const duplicates = options.checkDuplicates ? detectDuplicates(dependencies, config.duplicateCategories) : [];

      // Calculate summary
      const summary = {
        total: dependencies.length,
        keep: dependencies.filter((d) => d.verdict === "KEEP").length,
        recodeNative: dependencies.filter((d) => d.verdict === "RECODE_NATIVE").length,
        consolidate: duplicates.reduce(
          (acc, g) => acc + g.libraries.filter((l) => l.recommendation === "migrate").length,
          0
        ),
        remove: dependencies.filter((d) => d.verdict === "REMOVE").length,
        peerDep: dependencies.filter((d) => d.verdict === "PEER_DEP").length,
        investigate: dependencies.filter((d) => d.verdict === "INVESTIGATE").length,
      };

      const estimatedSavings = {
        bundleKb: duplicates.reduce((acc, g) => acc + g.potentialSavings.bundleKb, 0) +
          dependencies
            .filter((d) => d.verdict === "RECODE_NATIVE" || d.verdict === "REMOVE")
            .length * 5,
        dependencyCount:
          duplicates.reduce((acc, g) => acc + g.potentialSavings.dependencyCount, 0) +
          dependencies.filter((d) => d.verdict === "REMOVE").length,
      };

      const result: ScanResult = {
        projectPath,
        scannedAt: new Date().toISOString(),
        dependencies,
        duplicates,
        summary,
        estimatedSavings,
      };

      // Output
      await outputResult(result, format, output, options.actionableOnly);

      // Exit with appropriate code for CI
      if (options.exitCode !== false && hasActionableIssues(result, !!options.checkDuplicates)) {
        process.exit(EXIT_ISSUES_FOUND);
      }
    } catch (error) {
      handleError(error);
    }
  });

// ═══════════════════════════════════════════
// analyze command
// ═══════════════════════════════════════════

program
  .command("analyze <package>")
  .description("Analyze a specific dependency")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-s, --src <paths...>", "Source directories")
  .option("-f, --format <type>", "Output format: console, markdown, json")
  .option("-o, --output <file>", "Output file path")
  .option("-v, --verbose", "Verbose output")
  .option("--no-config", "Ignore config file")
  .action(async (packageName, options) => {
    try {
      const projectPath = await validateProjectPath(options.path);

      // Load config file
      const fileConfig = options.config !== false ? await loadConfig(projectPath) : null;

      // Merge CLI options with config
      const cliOptions: Partial<DepScopeConfig> = {
        ...(options.src && { srcPaths: options.src }),
        ...(options.verbose !== undefined && { verbose: options.verbose }),
        ...(options.format && { format: validateFormat(options.format) }),
        ...(options.output && { output: options.output }),
      };

      const config = resolveConfig(cliOptions, fileConfig);

      const format = config.format ?? "console";
      const output = config.output ?? options.output;

      const srcPaths = resolveSrcPaths(projectPath, config.srcPaths);
      const analyzer = new UsageAnalyzer({
        srcPaths,
        threshold: config.threshold,
        includeDev: true,
        ignore: config.ignore,
        verbose: config.verbose,
        wellKnownPatterns: config.wellKnownPatterns,
        nativeAlternatives: config.nativeAlternatives,
        duplicateCategories: config.duplicateCategories,
      });

      if (config.verbose) {
        console.log(`Analyzing ${packageName} in ${projectPath}...`);
      }

      const analysis = await analyzer.analyzeSingleDependency(projectPath, packageName);

      // Output
      switch (format) {
        case "markdown":
          const md = markdownReporter.generateDependencyReport(analysis);
          if (output) {
            await fs.writeFile(output, md);
            console.log(`Report saved to ${output}`);
          } else {
            console.log(md);
          }
          break;

        case "json":
          const json = JSON.stringify(analysis, null, 2);
          if (output) {
            await fs.writeFile(output, json);
            console.log(`Report saved to ${output}`);
          } else {
            console.log(json);
          }
          break;

        case "console":
        default:
          consoleReporter.printDependencyAnalysis(analysis);
          break;
      }
    } catch (error) {
      handleError(error);
    }
  });

// ═══════════════════════════════════════════
// duplicates command
// ═══════════════════════════════════════════

program
  .command("duplicates")
  .description("Find duplicate/overlapping libraries")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-s, --src <paths...>", "Source directories")
  .option("-f, --format <type>", "Output format: console, markdown, json")
  .option("-o, --output <file>", "Output file path")
  .option("--no-config", "Ignore config file")
  .action(async (options) => {
    try {
      const projectPath = await validateProjectPath(options.path);

      // Load config file
      const fileConfig = options.config !== false ? await loadConfig(projectPath) : null;

      // Merge CLI options with config
      const cliOptions: Partial<DepScopeConfig> = {
        ...(options.src && { srcPaths: options.src }),
        ...(options.format && { format: validateFormat(options.format) }),
        ...(options.output && { output: options.output }),
      };

      const config = resolveConfig(cliOptions, fileConfig);

      const format = config.format ?? "console";
      const output = config.output ?? options.output;

      const srcPaths = resolveSrcPaths(projectPath, config.srcPaths);
      const analyzer = new UsageAnalyzer({
        srcPaths,
        threshold: config.threshold,
        includeDev: false,
        ignore: config.ignore,
        verbose: false,
        wellKnownPatterns: config.wellKnownPatterns,
        nativeAlternatives: config.nativeAlternatives,
        duplicateCategories: config.duplicateCategories,
      });

      const dependencies = await analyzer.scanProject(projectPath);
      const duplicates = detectDuplicates(dependencies, config.duplicateCategories);

      if (duplicates.length === 0) {
        console.log("No duplicate libraries detected.");
        return;
      }

      // Output
      switch (format) {
        case "json":
          const json = JSON.stringify(duplicates, null, 2);
          if (output) {
            await fs.writeFile(output, json);
            console.log(`Report saved to ${output}`);
          } else {
            console.log(json);
          }
          break;

        case "console":
        default:
          console.log("");
          consoleReporter.printDuplicates(duplicates);
          break;
      }
    } catch (error) {
      handleError(error);
    }
  });

// ═══════════════════════════════════════════
// report command
// ═══════════════════════════════════════════

program
  .command("report")
  .description("Generate a full dependency report")
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-s, --src <paths...>", "Source directories")
  .option("-t, --threshold <n>", "Symbol threshold for RECODE verdict")
  .option("-d, --include-dev", "Include devDependencies")
  .option("-f, --format <type>", "Output format: markdown, json", "markdown")
  .option("-o, --output <file>", "Output file path", "./dep-scope-report.md")
  .option("--no-config", "Ignore config file")
  .action(async (options) => {
    try {
      const projectPath = await validateProjectPath(options.path);

      // Load config file
      const fileConfig = options.config !== false ? await loadConfig(projectPath) : null;

      // Merge CLI options with config
      const cliOptions: Partial<DepScopeConfig> = {
        ...(options.src && { srcPaths: options.src }),
        ...(options.threshold && { threshold: validateThreshold(options.threshold) }),
        ...(options.includeDev !== undefined && { includeDev: options.includeDev }),
        ...(options.format && { format: validateFormat(options.format) }),
        ...(options.output && { output: options.output }),
      };

      const config = resolveConfig(cliOptions, fileConfig);

      const format = config.format ?? "markdown";
      const output = config.output ?? options.output ?? "./dep-scope-report.md";

      const srcPaths = resolveSrcPaths(projectPath, config.srcPaths);
      const analyzer = new UsageAnalyzer({
        srcPaths,
        threshold: config.threshold,
        includeDev: config.includeDev,
        ignore: config.ignore,
        verbose: false,
        wellKnownPatterns: config.wellKnownPatterns,
        nativeAlternatives: config.nativeAlternatives,
        duplicateCategories: config.duplicateCategories,
      });

      console.log(`Generating report for ${projectPath}...`);

      const dependencies = await analyzer.scanProject(projectPath);
      const duplicates = detectDuplicates(dependencies, config.duplicateCategories);

      const summary = {
        total: dependencies.length,
        keep: dependencies.filter((d) => d.verdict === "KEEP").length,
        recodeNative: dependencies.filter((d) => d.verdict === "RECODE_NATIVE").length,
        consolidate: duplicates.reduce(
          (acc, g) => acc + g.libraries.filter((l) => l.recommendation === "migrate").length,
          0
        ),
        remove: dependencies.filter((d) => d.verdict === "REMOVE").length,
        peerDep: dependencies.filter((d) => d.verdict === "PEER_DEP").length,
        investigate: dependencies.filter((d) => d.verdict === "INVESTIGATE").length,
      };

      const estimatedSavings = {
        bundleKb: duplicates.reduce((acc, g) => acc + g.potentialSavings.bundleKb, 0),
        dependencyCount: duplicates.reduce((acc, g) => acc + g.potentialSavings.dependencyCount, 0),
      };

      const result: ScanResult = {
        projectPath,
        scannedAt: new Date().toISOString(),
        dependencies,
        duplicates,
        summary,
        estimatedSavings,
      };

      let outputContent: string;
      let ext: string;

      switch (format) {
        case "json":
          outputContent = JSON.stringify(result, null, 2);
          ext = ".json";
          break;
        case "markdown":
        default:
          outputContent = markdownReporter.generateScanReport(result);
          ext = ".md";
          break;
      }

      const outputPath = output.endsWith(ext)
        ? output
        : output.replace(/\.[^.]+$/, ext);

      await fs.writeFile(outputPath, outputContent);
      console.log(`Report saved to ${outputPath}`);

      // Also print summary
      consoleReporter.printScanSummary(result);
    } catch (error) {
      handleError(error);
    }
  });

// ═══════════════════════════════════════════
// migrate command
// ═══════════════════════════════════════════

program
  .command("migrate [package]")
  .description(
    "Generate LLM-ready migration prompts. Pass a package name to target one dep, " +
    "or omit it to auto-detect all migratable dependencies in the project."
  )
  .option("-p, --path <path>", "Project path", process.cwd())
  .option("-s, --src <paths...>", "Source directories")
  .option(
    "-o, --output <file>",
    "Output file path — only valid when targeting a single package"
  )
  .option("--dry-run", "Preview what would be generated without writing files")
  .option("--no-config", "Ignore config file")
  .action(async (packageName: string | undefined, options) => {
    try {
      const projectPath = await validateProjectPath(options.path);

      const fileConfig = options.config !== false ? await loadConfig(projectPath) : null;
      const cliOptions: Partial<DepScopeConfig> = {
        ...(options.src && { srcPaths: options.src }),
        includeDev: true,
      };
      const config = resolveConfig(cliOptions, fileConfig);

      const tsConfig = resolveTsConfig(projectPath);
      const framework = await detectFramework(projectPath);
      const packageManager = detectPackageManager(projectPath);
      const analyzer = buildAnalyzer(config, projectPath, framework);

      const context: MigrationContext = {
        tsconfigTarget: tsConfig.target,
        framework,
        importStyle: "barrel",
        projectPath,
        packageManager,
      };

      const dryRun = options.dryRun === true;
      if (dryRun) console.log("(dry-run — no files will be written)\n");

      if (packageName) {
        // ── Single-package mode ──────────────────────────────────────
        console.log(`Analyzing ${packageName} in ${projectPath}...`);
        const analysis = await analyzer.analyzeSingleDependency(projectPath, packageName);

        const template = getOrBuildTemplate(packageName, analysis);
        if (!template) {
          console.error(
            `No migration data for "${packageName}". ` +
            `dep-scope has no native alternatives recorded for this package.`
          );
          process.exit(EXIT_ERROR);
        }

        const output = generateMigration(analysis, { ...context, importStyle: analysis.importStyle }, template);
        const outputPath = options.output ?? output.outputPath;
        const resolvedOutput = path.isAbsolute(outputPath)
          ? outputPath
          : path.join(projectPath, outputPath);

        if (!dryRun) {
          await fs.mkdir(path.dirname(resolvedOutput), { recursive: true });
          await fs.writeFile(resolvedOutput, output.markdown, "utf-8");
          console.log(`\nMigration prompt generated: ${resolvedOutput}`);
        } else {
          console.log(`\nWould generate: ${resolvedOutput}`);
        }

        console.log(`\nSummary:`);
        console.log(`  Package:  ${packageName} ${analysis.version}`);
        console.log(`  Symbols:  ${output.metadata.symbolCount}`);
        console.log(`  Files:    ${output.metadata.fileCount}`);
        console.log(`  Target:   ${output.metadata.targetEcmaVersion}`);
        if (!dryRun) {
          console.log(`\nTo use with Claude Code:`);
          console.log(`  claude -p "$(cat ${outputPath})"`);
        }
      } else {
        // ── Auto-detect mode ─────────────────────────────────────────
        console.log(`Scanning ${projectPath} for migration candidates...`);
        const dependencies = await analyzer.scanProject(projectPath);

        // Run duplicate detection to resolve CONSOLIDATE pairs
        const duplicates = detectDuplicates(dependencies, config.duplicateCategories);

        // Build a map: packageName → names of other packages in same duplicate group
        const duplicateGroupMembers = new Map<string, string[]>();
        for (const group of duplicates) {
          const names = group.libraries.map((l) => l.name);
          for (const name of names) {
            duplicateGroupMembers.set(name, names.filter((n) => n !== name));
          }
        }

        // RECODE_NATIVE: direct native replacement candidates
        // CONSOLIDATE with alternatives: only keep the loser (fewest files) when
        //   multiple packages in the same group all have native alternatives,
        //   to avoid generating conflicting prompts (e.g. uuid↔nanoid both → crypto.randomUUID)
        const consolidateCandidates = dependencies.filter(
          (d) => d.verdict === "CONSOLIDATE" && d.alternatives.length > 0
        );

        const filteredConsolidate = consolidateCandidates.filter((dep) => {
          const groupPeers = duplicateGroupMembers.get(dep.name) ?? [];
          const conflictingPeers = consolidateCandidates.filter((c) =>
            groupPeers.includes(c.name)
          );
          if (conflictingPeers.length === 0) return true;

          // Multiple candidates in same group — keep only the one with fewest files (the loser)
          const allInGroup = [dep, ...conflictingPeers];
          const loser = allInGroup.reduce((min, curr) =>
            curr.files.length < min.files.length ? curr : min
          );
          return dep.name === loser.name;
        });

        const candidates = [
          ...dependencies.filter((d) => d.verdict === "RECODE_NATIVE"),
          ...filteredConsolidate,
        ];

        if (candidates.length === 0) {
          console.log("No migration candidates found — nothing to generate.");
          return;
        }

        const outputDir = path.join(projectPath, ".dep-scope");
        if (!dryRun) await fs.mkdir(outputDir, { recursive: true });

        const generated: Array<{ name: string; slug: string; fileCount: number }> = [];
        const skipped: string[] = [];

        for (const dep of candidates) {
          const template = getOrBuildTemplate(dep.name, dep);
          if (!template) {
            skipped.push(dep.name);
            continue;
          }

          const output = generateMigration(dep, { ...context, importStyle: dep.importStyle }, template);
          const slug = dep.name.replace(/[@/]/g, "-").replace(/^-/, "");
          const filePath = path.join(outputDir, `migrate-${slug}.md`);

          if (!dryRun) {
            await fs.writeFile(filePath, output.markdown, "utf-8");
          }
          generated.push({ name: dep.name, slug, fileCount: dep.fileCount });
        }

        const verb = dryRun ? "Would generate" : "Generated";
        console.log(`\n${verb} ${generated.length} migration prompt(s) in .dep-scope/`);

        for (const { name, slug, fileCount } of generated) {
          const complexity = fileCount <= 1 ? "trivial" : fileCount <= 5 ? "easy" : fileCount <= 20 ? "medium" : "complex";
          console.log(`  ${name} → .dep-scope/migrate-${slug}.md  (${fileCount} file${fileCount !== 1 ? "s" : ""}, ${complexity})`);
        }

        if (skipped.length > 0) {
          console.log(`\nSkipped (no migration data): ${skipped.join(", ")}`);
        }

        if (!dryRun && generated.length > 0) {
          console.log(`\nTo migrate with Claude Code:`);
          for (const { slug } of generated) {
            console.log(`  claude -p "$(cat .dep-scope/migrate-${slug}.md)"`);
          }
        }
      }
    } catch (error) {
      handleError(error);
    }
  });

/**
 * Detect the primary framework from package.json dependencies
 */
async function detectFramework(
  projectPath: string
): Promise<MigrationContext["framework"]> {
  try {
    const pkgPath = path.join(projectPath, "package.json");
    const content = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    if ("next" in allDeps) return "nextjs";
    if ("react" in allDeps) return "react";
    return "node";
  } catch {
    return "unknown";
  }
}

// ═══════════════════════════════════════════
// init command
// ═══════════════════════════════════════════

program
  .command("init")
  .description("Create a dep-scope config file")
  .option("-p, --path <path>", "Project path", process.cwd())
  .action(async (options) => {
    try {
      const projectPath = await validateProjectPath(options.path);
      const configPath = path.join(projectPath, ".depscoperc.json");

      // Check if config already exists
      try {
        await fs.access(configPath);
        console.log("Config file already exists at .depscoperc.json");
        return;
      } catch {
        // File doesn't exist, continue
      }

      const defaultConfig: DepScopeConfig = {
        extends: "minimal",
        srcPaths: ["./src"],
        threshold: 5,
        includeDev: false,
        format: "console",
      };

      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2) + "\n");
      console.log("Created .depscoperc.json with default configuration.");
      console.log("\nYou can customize:");
      console.log("  - extends: preset to use (minimal, react, node)");
      console.log("  - srcPaths: directories to scan");
      console.log("  - threshold: symbol count for RECODE_NATIVE verdict");
      console.log("  - ignore: packages to skip");
      console.log("  - wellKnownPatterns: auto-KEEP/IGNORE packages");
      console.log("  - format: default output format");
      console.log("\nFor TypeScript config, use: depscope.config.ts with defineConfig()");
    } catch (error) {
      handleError(error);
    }
  });

// ═══════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════

async function outputResult(
  result: ScanResult,
  format: Format,
  output: string | undefined,
  actionableOnly?: boolean
): Promise<void> {
  switch (format) {
    case "markdown":
      const md = markdownReporter.generateScanReport(result, { actionableOnly });
      if (output) {
        await fs.writeFile(output, md);
        console.log(`Report saved to ${output}`);
      } else {
        console.log(md);
      }
      break;

    case "json":
      // Filter INVESTIGATE from JSON output if actionableOnly
      const jsonResult = actionableOnly
        ? {
            ...result,
            dependencies: result.dependencies.filter((d) => d.verdict !== "INVESTIGATE"),
            summary: {
              ...result.summary,
              investigate: 0,
            },
          }
        : result;
      const json = JSON.stringify(jsonResult, null, 2);
      if (output) {
        await fs.writeFile(output, json);
        console.log(`Report saved to ${output}`);
      } else {
        console.log(json);
      }
      break;

    case "console":
    default:
      consoleReporter.printScanSummary(result, { actionableOnly });
      consoleReporter.printDuplicates(result.duplicates);
      consoleReporter.printActionItems(result.dependencies, { actionableOnly });
      break;
  }
}

// Parse and run
program.parse();

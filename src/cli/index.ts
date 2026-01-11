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
import type { ScanResult, Verdict } from "../types/index.js";

const VERSION = "0.1.0";

const VALID_FORMATS = ["console", "markdown", "json"] as const;
type Format = (typeof VALID_FORMATS)[number];

// Exit codes for CI integration
const EXIT_SUCCESS = 0;
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
 * Determine if there are actionable issues in the scan result
 */
function hasActionableIssues(result: ScanResult): boolean {
  // Issues = REMOVE, RECODE_NATIVE, or duplicates
  return (
    result.summary.remove > 0 ||
    result.summary.recodeNative > 0 ||
    result.summary.peerDep > 0 ||
    result.duplicates.length > 0
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
  .option("--with-knip", "Use Knip for pre-analysis (improved accuracy)")
  .option("--actionable-only", "Show only actionable items (hide INVESTIGATE)")
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
        ...(options.withKnip !== undefined && { withKnip: options.withKnip }),
      };

      // Resolve config with presets and defaults
      const config = resolveConfig(cliOptions, fileConfig);

      // autoDetect is false when --no-auto-detect is used
      const autoDetectWorkspace = options.autoDetect !== false;

      const analyzer = new UsageAnalyzer({
        srcPaths: config.srcPaths,
        threshold: config.threshold,
        fileCountThreshold: config.fileCountThreshold,
        includeDev: config.includeDev,
        ignore: config.ignore,
        verbose: config.verbose,
        withKnip: config.withKnip,
        autoDetectWorkspace,
        wellKnownPatterns: config.wellKnownPatterns,
      });

      const format = config.format ?? "console";
      const output = config.output ?? options.output;

      if (config.verbose) {
        console.log(`Scanning project at ${projectPath}...`);
        if (fileConfig) {
          console.log("Using config file.");
        }
        if (config.withKnip) {
          console.log("Knip integration enabled.");
        }
      }

      const dependencies = await analyzer.scanProject(projectPath);
      const duplicates = detectDuplicates(dependencies);

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
      await outputResult(result, format, output, "scan", options.actionableOnly);

      // Exit with appropriate code for CI
      if (options.exitCode !== false && hasActionableIssues(result)) {
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

      const analyzer = new UsageAnalyzer({
        srcPaths: config.srcPaths,
        threshold: config.threshold,
        includeDev: true,
        ignore: config.ignore,
        verbose: config.verbose,
        wellKnownPatterns: config.wellKnownPatterns,
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

      const analyzer = new UsageAnalyzer({
        srcPaths: config.srcPaths,
        threshold: config.threshold,
        includeDev: false,
        ignore: config.ignore,
        verbose: false,
        wellKnownPatterns: config.wellKnownPatterns,
      });

      const dependencies = await analyzer.scanProject(projectPath);
      const duplicates = detectDuplicates(dependencies);

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

      const analyzer = new UsageAnalyzer({
        srcPaths: config.srcPaths,
        threshold: config.threshold,
        includeDev: config.includeDev,
        ignore: config.ignore,
        verbose: false,
        wellKnownPatterns: config.wellKnownPatterns,
      });

      console.log(`Generating report for ${projectPath}...`);

      const dependencies = await analyzer.scanProject(projectPath);
      const duplicates = detectDuplicates(dependencies);

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
  type: "scan" | "duplicates",
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

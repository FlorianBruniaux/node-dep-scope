#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as path from "node:path";
import { readFile } from "node:fs/promises";
import { UsageAnalyzer } from "../analyzers/usage-analyzer.js";
import { TransitiveAnalyzer } from "../analyzers/transitive-analyzer.js";
import { detectDuplicates } from "../rules/duplicate-categories.js";
import { loadConfig, resolveConfig } from "../config/index.js";
import { resolveSrcPaths } from "../utils/src-paths-resolver.js";
import { resolveTsConfig } from "../utils/tsconfig-resolver.js";
import { detectPackageManager } from "../utils/package-manager-detector.js";
import { PackageJsonReader } from "../utils/package-json-reader.js";
import { isKnipAvailable } from "../integrations/knip.js";
import { generateMigration, getOrBuildTemplate } from "../migration/index.js";
import type { MigrationContext } from "../migration/types.js";

const VERSION = "0.4.0";

// ─── helpers ────────────────────────────────────────────────────────────────

async function buildAnalyzer(projectPath: string, options: {
  threshold?: number;
  includeDev?: boolean;
  srcPaths?: string[];
  withKnip?: boolean;
} = {}) {
  const fileConfig = await loadConfig(projectPath).catch(() => null);
  const config = resolveConfig(
    {
      ...(options.threshold !== undefined && { threshold: options.threshold }),
      ...(options.includeDev !== undefined && { includeDev: options.includeDev }),
      ...(options.srcPaths !== undefined && { srcPaths: options.srcPaths }),
    },
    fileConfig
  );
  const srcPaths = resolveSrcPaths(projectPath, config.srcPaths);
  const withKnip = options.withKnip ?? isKnipAvailable(projectPath);
  return {
    analyzer: new UsageAnalyzer({
      srcPaths,
      threshold: config.threshold,
      includeDev: config.includeDev ?? false,
      ignore: config.ignore,
      verbose: false,
      withKnip,
      wellKnownPatterns: config.wellKnownPatterns,
      nativeAlternatives: config.nativeAlternatives,
      duplicateCategories: config.duplicateCategories,
    }),
    config,
  };
}

async function detectFramework(projectPath: string): Promise<MigrationContext["framework"]> {
  try {
    const content = await readFile(path.join(projectPath, "package.json"), "utf-8");
    const pkg = JSON.parse(content) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    if ("next" in all) return "nextjs";
    if ("react" in all) return "react";
    return "node";
  } catch {
    return "unknown";
  }
}

// ─── server ─────────────────────────────────────────────────────────────────

const server = new McpServer({ name: "dep-scope", version: VERSION });

// ── scan_project ─────────────────────────────────────────────────────────────

server.registerTool(
  "scan_project",
  {
    description: "Scan all npm dependencies in a project and get symbol-level verdicts (KEEP, REMOVE, RECODE_NATIVE, CONSOLIDATE, PEER_DEP, INVESTIGATE).",
    inputSchema: {
      projectPath: z.string().optional().describe("Absolute path to the project (defaults to cwd)"),
      srcPaths: z.array(z.string()).optional().describe("Source directories to scan (e.g. ['src', 'app']). Use ['.'] to scan the full project root."),
      checkDuplicates: z.boolean().optional().default(false).describe("Include duplicate library detection"),
      checkTransitive: z.boolean().optional().default(false).describe("Scan transitive deps for packages with native alternatives"),
      threshold: z.number().optional().describe("Symbol count threshold for RECODE verdict (default 5)"),
      includeDev: z.boolean().optional().default(false).describe("Include devDependencies"),
      withKnip: z.boolean().optional().describe("Use Knip for pre-analysis (auto-detected by default)"),
    },
  },
  async ({ projectPath: rawPath, srcPaths, checkDuplicates, checkTransitive, threshold, includeDev, withKnip }) => {
    const projectPath = path.resolve(rawPath ?? process.cwd());
    const { analyzer, config } = await buildAnalyzer(projectPath, { threshold, includeDev, srcPaths, withKnip });
    const dependencies = await analyzer.scanProject(projectPath);
    const duplicates = checkDuplicates ? detectDuplicates(dependencies, config.duplicateCategories) : [];
    const summary = {
      total: dependencies.length,
      keep: dependencies.filter((d) => d.verdict === "KEEP").length,
      recodeNative: dependencies.filter((d) => d.verdict === "RECODE_NATIVE").length,
      remove: dependencies.filter((d) => d.verdict === "REMOVE").length,
      peerDep: dependencies.filter((d) => d.verdict === "PEER_DEP").length,
      investigate: dependencies.filter((d) => d.verdict === "INVESTIGATE").length,
      consolidate: duplicates.reduce((acc, g) => acc + g.libraries.filter((l) => l.recommendation === "migrate").length, 0),
    };

    let transitiveEchoes: import("../types/index.js").TransitiveEchoFinding[] | undefined;
    if (checkTransitive) {
      try {
        const pkgJson = await new PackageJsonReader().read(projectPath);
        const directDepNames = Object.keys({
          ...pkgJson.dependencies,
          ...(config.includeDev ? pkgJson.devDependencies : {}),
        });
        transitiveEchoes = await new TransitiveAnalyzer().analyze(projectPath, directDepNames);
      } catch {
        transitiveEchoes = [];
      }
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          projectPath,
          scannedAt: new Date().toISOString(),
          summary,
          dependencies,
          duplicates,
          ...(transitiveEchoes !== undefined && { transitiveEchoes }),
        }, null, 2),
      }],
    };
  }
);

// ── analyze_package ───────────────────────────────────────────────────────────

server.registerTool(
  "analyze_package",
  {
    description: "Analyze symbol-level usage of a specific npm package: which symbols are imported, from which files, verdict, and native alternatives.",
    inputSchema: {
      packageName: z.string().describe("npm package name (e.g. lodash)"),
      projectPath: z.string().optional().describe("Absolute path to the project (defaults to cwd)"),
      srcPaths: z.array(z.string()).optional().describe("Source directories to scan. Use ['.'] to scan the full project root."),
    },
  },
  async ({ packageName, projectPath: rawPath, srcPaths }) => {
    const projectPath = path.resolve(rawPath ?? process.cwd());
    const { analyzer } = await buildAnalyzer(projectPath, { includeDev: true, srcPaths });
    const analysis = await analyzer.analyzeSingleDependency(projectPath, packageName);
    return { content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }] };
  }
);

// ── get_migration_candidates ──────────────────────────────────────────────────

server.registerTool(
  "get_migration_candidates",
  {
    description: "List all packages that can be migrated to native JS alternatives (RECODE_NATIVE) or consolidated (CONSOLIDATE). Returns packages with their alternatives and file locations.",
    inputSchema: {
      projectPath: z.string().optional().describe("Absolute path to the project (defaults to cwd)"),
    },
  },
  async ({ projectPath: rawPath }) => {
    const projectPath = path.resolve(rawPath ?? process.cwd());
    const { analyzer, config } = await buildAnalyzer(projectPath);
    const dependencies = await analyzer.scanProject(projectPath);
    const duplicates = detectDuplicates(dependencies, config.duplicateCategories);

    const duplicateGroupMembers = new Map<string, string[]>();
    for (const group of duplicates) {
      const names = group.libraries.map((l) => l.name);
      for (const n of names) duplicateGroupMembers.set(n, names.filter((x) => x !== n));
    }

    const consolidateCandidates = dependencies.filter(
      (d) => d.verdict === "CONSOLIDATE" && d.alternatives.length > 0
    );
    const filteredConsolidate = consolidateCandidates.filter((dep) => {
      const peers = duplicateGroupMembers.get(dep.name) ?? [];
      const conflicting = consolidateCandidates.filter((c) => peers.includes(c.name));
      if (conflicting.length === 0) return true;
      const loser = [dep, ...conflicting].reduce((min, curr) =>
        curr.files.length < min.files.length ? curr : min
      );
      return dep.name === loser.name;
    });

    const candidates = [
      ...dependencies.filter((d) => d.verdict === "RECODE_NATIVE"),
      ...filteredConsolidate,
    ].map((d) => ({
      name: d.name,
      verdict: d.verdict,
      fileCount: d.fileCount,
      files: d.files,
      alternatives: d.alternatives,
    }));

    return {
      content: [{ type: "text", text: JSON.stringify({ count: candidates.length, candidates }, null, 2) }],
    };
  }
);

// ── generate_migration_prompt ─────────────────────────────────────────────────

server.registerTool(
  "generate_migration_prompt",
  {
    description: "Generate a ready-to-use LLM migration prompt for a specific package. Returns the markdown content with symbol-by-symbol replacement instructions.",
    inputSchema: {
      packageName: z.string().describe("npm package name to migrate (e.g. lodash)"),
      projectPath: z.string().optional().describe("Absolute path to the project (defaults to cwd)"),
    },
  },
  async ({ packageName, projectPath: rawPath }) => {
    const projectPath = path.resolve(rawPath ?? process.cwd());
    const { analyzer } = await buildAnalyzer(projectPath, { includeDev: true });
    const analysis = await analyzer.analyzeSingleDependency(projectPath, packageName);
    const template = getOrBuildTemplate(packageName, analysis);
    if (!template) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: `No migration data for "${packageName}". dep-scope has no native alternatives recorded for this package.` }) }],
        isError: true,
      };
    }
    const tsConfig = resolveTsConfig(projectPath);
    const framework = await detectFramework(projectPath);
    const packageManager = detectPackageManager(projectPath);
    const context: MigrationContext = {
      tsconfigTarget: tsConfig.target,
      framework,
      importStyle: analysis.importStyle,
      projectPath,
      packageManager,
    };
    const output = generateMigration(analysis, context, template);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ packageName, markdown: output.markdown, metadata: output.metadata, suggestedOutputPath: output.outputPath }, null, 2),
      }],
    };
  }
);

// ── find_duplicates ───────────────────────────────────────────────────────────

server.registerTool(
  "find_duplicates",
  {
    description: "Find duplicate or overlapping libraries in a project (e.g. moment + date-fns both installed, multiple icon libraries).",
    inputSchema: {
      projectPath: z.string().optional().describe("Absolute path to the project (defaults to cwd)"),
    },
  },
  async ({ projectPath: rawPath }) => {
    const projectPath = path.resolve(rawPath ?? process.cwd());
    const { analyzer, config } = await buildAnalyzer(projectPath);
    const dependencies = await analyzer.scanProject(projectPath);
    const duplicates = detectDuplicates(dependencies, config.duplicateCategories);
    return {
      content: [{ type: "text", text: JSON.stringify({ count: duplicates.length, duplicates }, null, 2) }],
    };
  }
);

// ─── start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);

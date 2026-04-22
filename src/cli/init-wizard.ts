/**
 * Init Wizard
 * Interactive prompt sequence for generating a dep-scope config file.
 */

import { select, checkbox, input, confirm } from "@inquirer/prompts";
import pc from "picocolors";
import * as path from "node:path";
import type { ProjectInfo, Preset } from "../utils/project-detector.js";

export interface WizardResult {
  srcPaths: string[];
  includeDev: boolean;
  threshold: number;
  preset: Preset;
  format: "json" | "ts";
  outputPath: string;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  nextjs: "Next.js",
  react: "React",
  node: "Node.js",
  unknown: "Unknown",
};

/**
 * Run the interactive wizard.
 * Returns null if the user cancels or the terminal is not interactive.
 */
export async function runInitWizard(
  projectPath: string,
  info: ProjectInfo
): Promise<WizardResult | null> {
  if (!process.stdin.isTTY) {
    return null;
  }

  // Warn if a config already exists and ask to overwrite
  if (info.existingConfigPath) {
    const rel = path.relative(projectPath, info.existingConfigPath);
    const overwrite = await confirm({
      message: `${rel} already exists. Overwrite it?`,
      default: false,
    });
    if (!overwrite) return null;
  }

  printDetectionSummary(info);

  // ── Step 1: scan scope ───────────────────────────────────────────────────
  const scopeChoice = await select({
    message: "Source directories to scan:",
    choices: buildScopeChoices(info),
  });

  let srcPaths: string[];

  if (scopeChoice === "root") {
    srcPaths = ["."];
  } else if (scopeChoice === "manual") {
    const selected = await checkbox({
      message: "Select directories:",
      choices: buildDirChoices(info),
      validate: (items) =>
        items.length > 0 || "Select at least one directory.",
    });
    srcPaths = selected as string[];
  } else {
    // "auto" — use detected dirs or fall back to src
    srcPaths = info.existingDirs.length > 0 ? info.existingDirs : ["src"];
  }

  // ── Step 2: devDependencies ──────────────────────────────────────────────
  const includeDev = await confirm({
    message: "Include devDependencies in scan?",
    default: false,
  });

  // ── Step 3: threshold ────────────────────────────────────────────────────
  const thresholdRaw = await input({
    message: "Symbol threshold for RECODE_NATIVE verdict:",
    default: "5",
    validate: (v) => {
      const n = parseInt(v, 10);
      return (!isNaN(n) && n >= 1 && n <= 100) || "Enter a number between 1 and 100.";
    },
  });

  // ── Step 4: config format ────────────────────────────────────────────────
  const format = await select({
    message: "Config format:",
    choices: [
      { name: ".depscoperc.json  (simple JSON, recommended)", value: "json" },
      { name: "depscope.config.ts  (TypeScript with autocomplete)", value: "ts" },
    ],
  });

  const outputPath =
    format === "json"
      ? path.join(projectPath, ".depscoperc.json")
      : path.join(projectPath, "depscope.config.ts");

  return {
    srcPaths,
    includeDev,
    threshold: parseInt(thresholdRaw, 10),
    preset: info.suggestedPreset,
    format: format as "json" | "ts",
    outputPath,
  };
}

// ── Output generators ────────────────────────────────────────────────────────

export function generateJsonConfig(result: WizardResult): string {
  const config = {
    extends: result.preset,
    srcPaths: normalizePaths(result.srcPaths),
    threshold: result.threshold,
    includeDev: result.includeDev,
  };
  return JSON.stringify(config, null, 2) + "\n";
}

export function generateTsConfig(result: WizardResult): string {
  const paths = normalizePaths(result.srcPaths)
    .map((p) => `"${p}"`)
    .join(", ");
  return [
    `import { defineConfig } from 'dep-scope';`,
    ``,
    `export default defineConfig({`,
    `  extends: '${result.preset}',`,
    `  srcPaths: [${paths}],`,
    `  threshold: ${result.threshold},`,
    `  includeDev: ${result.includeDev},`,
    `});`,
    ``,
  ].join("\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function printDetectionSummary(info: ProjectInfo): void {
  const label = FRAMEWORK_LABELS[info.framework] ?? "Unknown";
  console.log("");
  console.log(pc.dim(`  Detected: ${label} project`));
  if (info.existingDirs.length > 0) {
    console.log(
      pc.dim(`  Found dirs: ${info.existingDirs.map((d) => `${d}/`).join(", ")}`)
    );
  }
  console.log("");
}

function buildScopeChoices(info: ProjectInfo) {
  const autoLabel =
    info.existingDirs.length > 0
      ? `Auto-detected: ${info.existingDirs.map((d) => `${d}/`).join(", ")}  (recommended)`
      : "src/  (default)";

  return [
    { name: autoLabel, value: "auto" },
    { name: "Full project root (.)  — includes everything", value: "root" },
    { name: "Choose directories manually...", value: "manual" },
  ];
}

function buildDirChoices(info: ProjectInfo) {
  return info.candidateDirs.map((dir) => ({
    name: `${dir}/`,
    value: dir,
    checked: info.existingDirs.includes(dir),
  }));
}

function normalizePaths(paths: string[]): string[] {
  return paths.map((p) => (p === "." ? "." : `./${p}`));
}

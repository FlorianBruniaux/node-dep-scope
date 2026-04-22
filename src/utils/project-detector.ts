/**
 * Project Detector
 * Reads project signals (framework, existing dirs, config) to inform the init wizard.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { detectPackageManager } from "./package-manager-detector.js";

export type Framework = "nextjs" | "react" | "node" | "unknown";
export type PackageManager = ReturnType<typeof detectPackageManager>;
export type Preset = "react" | "node" | "minimal";

export interface ProjectInfo {
  framework: Framework;
  /** Directories that actually exist on disk, in priority order */
  existingDirs: string[];
  /** Full list of candidates checked */
  candidateDirs: string[];
  packageManager: PackageManager;
  suggestedPreset: Preset;
  existingConfigPath: string | null;
}

const CANDIDATE_DIRS = [
  "src",
  "app",
  "lib",
  "pages",
  "components",
  "hooks",
  "server",
  "scripts",
  "tools",
  "bin",
  "cli",
  "trpc",
  "shared",
];

const CONFIG_FILES = [
  ".depscoperc",
  ".depscoperc.json",
  "depscope.config.json",
  "depscope.config.yaml",
  "depscope.config.ts",
  "depscope.config.js",
];

export function detectProjectInfo(projectPath: string): ProjectInfo {
  const framework = detectFramework(projectPath);

  const existingDirs = CANDIDATE_DIRS.filter((dir) => {
    try {
      return fs.statSync(path.join(projectPath, dir)).isDirectory();
    } catch {
      return false;
    }
  });

  const existingConfigPath =
    CONFIG_FILES.map((f) => path.join(projectPath, f)).find((f) => {
      try {
        fs.accessSync(f);
        return true;
      } catch {
        return false;
      }
    }) ?? null;

  const suggestedPreset: Preset =
    framework === "nextjs" || framework === "react"
      ? "react"
      : framework === "node"
        ? "node"
        : "minimal";

  return {
    framework,
    existingDirs,
    candidateDirs: CANDIDATE_DIRS,
    packageManager: detectPackageManager(projectPath),
    suggestedPreset,
    existingConfigPath,
  };
}

function detectFramework(projectPath: string): Framework {
  try {
    const content = fs.readFileSync(
      path.join(projectPath, "package.json"),
      "utf-8"
    );
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    if ("next" in all) return "nextjs";
    if ("react" in all || "react-dom" in all) return "react";
    return "node";
  } catch {
    return "unknown";
  }
}

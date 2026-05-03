/**
 * Workspace Detector
 * Auto-detects monorepo configurations and extracts source paths
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import fg from "fast-glob";
import { parse as parseYaml } from "yaml";

export type WorkspaceType = "pnpm" | "turborepo" | "lerna" | "npm" | "yarn" | "none";

export interface WorkspaceConfig {
  type: WorkspaceType;
  /** Raw workspace patterns from config (e.g., "apps/*", "packages/*") */
  patterns: string[];
  /** Resolved package directories */
  packages: string[];
  /** Source paths to scan (includes src/, lib/, and package roots) */
  srcPaths: string[];
}

/**
 * Detect workspace configuration in a project
 */
export async function detectWorkspace(projectPath: string): Promise<WorkspaceConfig> {
  // Check pnpm-workspace.yaml first (most common in modern monorepos)
  const pnpmWorkspace = await tryPnpmWorkspace(projectPath);
  if (pnpmWorkspace) return pnpmWorkspace;

  // Check for Turborepo (uses package.json workspaces)
  const hasTurbo = await fileExists(path.join(projectPath, "turbo.json"));
  if (hasTurbo) {
    const npmWorkspace = await tryNpmWorkspace(projectPath);
    if (npmWorkspace) {
      return { ...npmWorkspace, type: "turborepo" };
    }
  }

  // Check lerna.json
  const lernaConfig = await tryLernaConfig(projectPath);
  if (lernaConfig) return lernaConfig;

  // Check package.json workspaces (npm/yarn)
  const npmWorkspace = await tryNpmWorkspace(projectPath);
  if (npmWorkspace) return npmWorkspace;

  // No monorepo detected - return default
  return {
    type: "none",
    patterns: [],
    packages: [],
    srcPaths: ["./src"],
  };
}

/**
 * Try to detect pnpm workspace configuration
 */
async function tryPnpmWorkspace(projectPath: string): Promise<WorkspaceConfig | null> {
  const workspacePath = path.join(projectPath, "pnpm-workspace.yaml");

  try {
    const content = await fs.readFile(workspacePath, "utf-8");
    const config = parseYaml(content) as { packages?: string[] };
    const patterns = config.packages ?? [];

    if (patterns.length === 0) return null;

    const packages = await resolveWorkspacePatterns(projectPath, patterns);
    const srcPaths = buildSrcPaths(packages);

    return {
      type: "pnpm",
      patterns,
      packages,
      srcPaths,
    };
  } catch {
    return null;
  }
}

/**
 * Try to detect npm/yarn workspace configuration from package.json
 */
async function tryNpmWorkspace(projectPath: string): Promise<WorkspaceConfig | null> {
  const pkgPath = path.join(projectPath, "package.json");

  try {
    const content = await fs.readFile(pkgPath, "utf-8");
    const pkg = JSON.parse(content) as {
      workspaces?: string[] | { packages?: string[] };
    };

    if (!pkg.workspaces) return null;

    // Handle both formats: array or object with packages key
    const patterns = Array.isArray(pkg.workspaces)
      ? pkg.workspaces
      : pkg.workspaces.packages ?? [];

    if (patterns.length === 0) return null;

    const packages = await resolveWorkspacePatterns(projectPath, patterns);
    const srcPaths = buildSrcPaths(packages);

    // Detect yarn vs npm based on lock file
    const hasYarnLock = await fileExists(path.join(projectPath, "yarn.lock"));
    const type: WorkspaceType = hasYarnLock ? "yarn" : "npm";

    return {
      type,
      patterns,
      packages,
      srcPaths,
    };
  } catch {
    return null;
  }
}

/**
 * Try to detect Lerna configuration
 */
async function tryLernaConfig(projectPath: string): Promise<WorkspaceConfig | null> {
  const lernaPath = path.join(projectPath, "lerna.json");

  try {
    const content = await fs.readFile(lernaPath, "utf-8");
    const config = JSON.parse(content) as { packages?: string[] };
    const patterns = config.packages ?? ["packages/*"];

    const packages = await resolveWorkspacePatterns(projectPath, patterns);
    const srcPaths = buildSrcPaths(packages);

    return {
      type: "lerna",
      patterns,
      packages,
      srcPaths,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve workspace glob patterns to actual directories
 */
async function resolveWorkspacePatterns(
  projectPath: string,
  patterns: string[]
): Promise<string[]> {
  const resolved: string[] = [];

  for (const pattern of patterns) {
    // Handle negation patterns
    if (pattern.startsWith("!")) continue;

    const matches = await fg(pattern, {
      cwd: projectPath,
      onlyDirectories: true,
      absolute: false,
    });

    resolved.push(...matches);
  }

  return resolved;
}

/**
 * Build source paths from package directories
 * For each package, we check common source directories
 */
function buildSrcPaths(packageDirs: string[]): string[] {
  const srcPaths: string[] = [];

  for (const pkg of packageDirs) {
    // Use forward slashes so fast-glob works on Windows
    const fwdPkg = pkg.replace(/\\/g, "/");
    srcPaths.push(
      `${fwdPkg}/src`,
      `${fwdPkg}/lib`,
      fwdPkg // Fallback to package root (for packages without src/)
    );
  }

  return srcPaths;
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

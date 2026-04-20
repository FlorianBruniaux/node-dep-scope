/**
 * Package Manager Detector
 * Infers the project's package manager from lockfile presence.
 */

import * as fs from "node:fs";
import * as path from "node:path";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Detect the package manager used in a project by checking for lockfiles.
 * Priority: bun > pnpm > yarn > npm (more specific managers take precedence).
 */
export function detectPackageManager(projectPath: string): PackageManager {
  const checks: [string, PackageManager][] = [
    ["bun.lockb", "bun"],
    ["bun.lock", "bun"],
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
  ];

  for (const [lockfile, pm] of checks) {
    if (fs.existsSync(path.join(projectPath, lockfile))) {
      return pm;
    }
  }

  return "npm"; // fallback
}

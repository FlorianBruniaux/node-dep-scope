/**
 * Source path resolver
 * Auto-detects common project directory structures when configured paths don't exist.
 */

import * as fs from "node:fs";
import * as path from "node:path";

/** Common source directories ordered by priority */
const COMMON_SRC_DIRS = [
  "src",
  "lib",
  "app",
  "pages",
  "components",
  "hooks",
  "server",
  "packages",
  "apps",
  "scripts",
  "tools",
  "bin",
  "cli",
];

/** Next.js specific directories to try first */
const NEXTJS_SRC_DIRS = ["src", "app", "lib", "components", "hooks", "server", "trpc", "shared", "scripts"];

/**
 * Resolve source paths for a project.
 *
 * If the configured paths all exist → return them as-is.
 * If none of the configured paths exist → auto-detect common directories.
 * Logs a warning when falling back to auto-detection.
 */
export function resolveSrcPaths(
  projectPath: string,
  configuredPaths: string[],
  framework?: string
): string[] {
  const resolved = configuredPaths.map((p) =>
    path.isAbsolute(p) ? p : path.join(projectPath, p)
  );

  const existing = resolved.filter((p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });

  if (existing.length > 0) {
    // At least one configured path exists — use only the existing ones
    return existing.map((p) => path.relative(projectPath, p) || ".");
  }

  // None of the configured paths exist — auto-detect
  const candidates = framework === "nextjs" ? NEXTJS_SRC_DIRS : COMMON_SRC_DIRS;
  const detected: string[] = [];

  for (const dir of candidates) {
    const full = path.join(projectPath, dir);
    try {
      if (fs.statSync(full).isDirectory()) {
        detected.push(`./${dir}`);
      }
    } catch {
      // not found, skip
    }
  }

  if (detected.length > 0) {
    console.warn(
      `  [dep-scope] Source path(s) ${configuredPaths.join(", ")} not found — ` +
        `auto-detected: ${detected.join(", ")}`
    );
    return detected;
  }

  // Last resort: scan from project root
  console.warn(
    `  [dep-scope] No standard source directories found — scanning from project root.`
  );
  return ["."];
}

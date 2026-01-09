/**
 * Knip integration for dep-scope
 * Uses Knip's analysis to improve accuracy and reduce false positives
 */

import { execSync } from "node:child_process";

export interface KnipIssue {
  file: string;
  dependencies: Array<{ name: string }>;
  devDependencies: Array<{ name: string }>;
  optionalPeerDependencies: Array<{ name: string }>;
  unlisted: Array<{ name: string }>;
  binaries: Array<{ name: string }>;
  unresolved: Array<{ name: string }>;
}

export interface KnipOutput {
  files: string[];
  issues: KnipIssue[];
}

export interface KnipAnalysis {
  unusedDependencies: Set<string>;
  unusedDevDependencies: Set<string>;
  unlistedDependencies: Set<string>;
  unresolvedImports: Set<string>;
  available: boolean;
  error?: string;
}

/**
 * Check if Knip is available in the project
 */
export function isKnipAvailable(projectPath: string): boolean {
  try {
    execSync("npx knip --version", {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Run Knip analysis on a project
 */
export async function runKnipAnalysis(projectPath: string): Promise<KnipAnalysis> {
  const result: KnipAnalysis = {
    unusedDependencies: new Set(),
    unusedDevDependencies: new Set(),
    unlistedDependencies: new Set(),
    unresolvedImports: new Set(),
    available: false,
  };

  try {
    // Check if Knip is available
    if (!isKnipAvailable(projectPath)) {
      result.error = "Knip is not installed. Run: npm install -D knip";
      return result;
    }

    result.available = true;

    // Run Knip with JSON reporter
    const output = execSync("npx knip --reporter json --no-exit-code", {
      cwd: projectPath,
      stdio: "pipe",
      timeout: 120000, // 2 minutes timeout
      encoding: "utf-8",
    });

    const knipOutput: KnipOutput = JSON.parse(output);

    // Extract unused dependencies from all issues
    for (const issue of knipOutput.issues) {
      for (const dep of issue.dependencies) {
        result.unusedDependencies.add(dep.name);
      }
      for (const dep of issue.devDependencies) {
        result.unusedDevDependencies.add(dep.name);
      }
      for (const dep of issue.unlisted) {
        result.unlistedDependencies.add(dep.name);
      }
      for (const dep of issue.unresolved) {
        result.unresolvedImports.add(dep.name);
      }
    }

    return result;
  } catch (error) {
    // Knip exits with code 1 when issues are found, but still outputs valid JSON
    if (error instanceof Error && "stdout" in error) {
      try {
        const stdout = (error as { stdout: string }).stdout;
        const knipOutput: KnipOutput = JSON.parse(stdout);

        for (const issue of knipOutput.issues) {
          for (const dep of issue.dependencies) {
            result.unusedDependencies.add(dep.name);
          }
          for (const dep of issue.devDependencies) {
            result.unusedDevDependencies.add(dep.name);
          }
          for (const dep of issue.unlisted) {
            result.unlistedDependencies.add(dep.name);
          }
          for (const dep of issue.unresolved) {
            result.unresolvedImports.add(dep.name);
          }
        }

        result.available = true;
        return result;
      } catch {
        // JSON parsing failed
      }
    }

    result.error = error instanceof Error ? error.message : String(error);
    return result;
  }
}

/**
 * Format Knip analysis summary for console output
 */
export function formatKnipSummary(analysis: KnipAnalysis): string {
  if (!analysis.available) {
    return `Knip: not available (${analysis.error ?? "unknown error"})`;
  }

  const parts: string[] = ["Knip pre-analysis:"];

  if (analysis.unusedDependencies.size > 0) {
    parts.push(`  ${analysis.unusedDependencies.size} unused dependencies`);
  }
  if (analysis.unusedDevDependencies.size > 0) {
    parts.push(`  ${analysis.unusedDevDependencies.size} unused devDependencies`);
  }
  if (analysis.unlistedDependencies.size > 0) {
    parts.push(`  ${analysis.unlistedDependencies.size} unlisted dependencies`);
  }

  if (parts.length === 1) {
    parts.push("  No issues found");
  }

  return parts.join("\n");
}

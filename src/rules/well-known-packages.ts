/**
 * Well-Known Package Matcher
 * Determines automatic verdicts for recognized packages
 */

import type { WellKnownPattern } from "../config/schema.js";
import type { Verdict } from "../types/index.js";

export interface WellKnownMatch {
  verdict: "KEEP" | "IGNORE";
  reason: string;
}

/**
 * Match a package name against well-known patterns
 * Returns the verdict and reason if matched, null otherwise
 */
export function matchWellKnownPackage(
  packageName: string,
  patterns: WellKnownPattern[]
): WellKnownMatch | null {
  for (const pattern of patterns) {
    if (matchesPattern(packageName, pattern.pattern)) {
      return {
        verdict: pattern.verdict,
        reason: pattern.reason ?? `Matches pattern: ${pattern.pattern}`,
      };
    }
  }
  return null;
}

/**
 * Check if a package name matches a glob-like pattern
 * Supports:
 * - Exact match: "react"
 * - Wildcard suffix: "@types/*"
 * - Wildcard anywhere: "eslint-*"
 */
function matchesPattern(packageName: string, pattern: string): boolean {
  // Exact match
  if (!pattern.includes("*")) {
    return packageName === pattern;
  }

  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
    .replace(/\*/g, ".*"); // Convert * to .*

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(packageName);
}

/**
 * Get verdict for a well-known package
 * IGNORE -> Package will be excluded from analysis
 * KEEP -> Package gets KEEP verdict without investigation
 */
export function getWellKnownVerdict(
  packageName: string,
  patterns: WellKnownPattern[]
): { verdict: Verdict; reason: string } | null {
  const match = matchWellKnownPackage(packageName, patterns);

  if (!match) {
    return null;
  }

  // Map IGNORE to verdict system
  // IGNORE means "skip this package entirely"
  // KEEP means "keep this package, don't investigate"
  return {
    verdict: match.verdict === "IGNORE" ? "KEEP" : "KEEP",
    reason: match.reason,
  };
}

/**
 * Check if a package should be completely ignored (not analyzed)
 */
export function shouldIgnoreWellKnown(
  packageName: string,
  patterns: WellKnownPattern[]
): boolean {
  const match = matchWellKnownPackage(packageName, patterns);
  return match?.verdict === "IGNORE";
}

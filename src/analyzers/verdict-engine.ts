/**
 * Verdict Engine
 * Phase 2.3 - Extracted from UsageAnalyzer for better testability and SRP
 */

import type {
  IVerdictEngine,
  VerdictContext,
  VerdictResult,
  ILogger,
} from "../types/index.js";
import type { InvestigateReason, Verdict, KnipPreAnalysis } from "../types/index.js";
import { ConsoleLogger } from "../utils/logger.js";
import { matchWellKnownPackage } from "../rules/well-known-packages.js";

/**
 * Verdict Engine Dependencies
 */
export interface VerdictEngineDependencies {
  logger?: ILogger;
}

/**
 * Extended context for verdict calculation (includes Knip analysis)
 */
export interface VerdictCalculationContext extends VerdictContext {
  knipAnalysis?: KnipPreAnalysis | null;
}

/**
 * Verdict Engine Implementation
 * Determines verdicts and confidence scores for dependencies
 */
export class VerdictEngine implements IVerdictEngine {
  private readonly logger: ILogger;

  constructor(deps: VerdictEngineDependencies = {}) {
    this.logger = deps.logger ?? new ConsoleLogger();
  }

  /**
   * Determine verdict for a dependency based on its usage context
   */
  determineVerdict(context: VerdictContext): VerdictResult {
    const {
      packageName,
      symbolsUsed,
      alternatives,
      totalImports,
      peerDepInfo,
      fileCount,
      options,
    } = context;

    const threshold = options.threshold ?? 5;
    const fileThreshold = options.fileCountThreshold ?? 3;
    const wellKnownPatterns = options.wellKnownPatterns ?? [];

    // Check wellKnownPatterns for KEEP verdict (highest priority after REMOVE/PEER_DEP)
    const wellKnownMatch = matchWellKnownPackage(packageName, wellKnownPatterns);
    if (wellKnownMatch && wellKnownMatch.verdict === "KEEP") {
      this.logger.debug(
        `Package ${packageName} matched well-known pattern: ${wellKnownMatch.reason}`
      );
      return { verdict: "KEEP", wellKnownReason: wellKnownMatch.reason };
    }

    // No imports - check if it's a peer dependency
    if (totalImports === 0) {
      // If it's required by other packages, it's a peer dep (redundant in package.json)
      if (peerDepInfo && peerDepInfo.requiredBy.length > 0) {
        this.logger.debug(
          `Package ${packageName} has no imports but is required by: ${peerDepInfo.requiredBy.join(", ")}`
        );
        return { verdict: "PEER_DEP" };
      }
      this.logger.debug(`Package ${packageName} has no imports, marking as REMOVE`);
      return { verdict: "REMOVE" };
    }

    // Few symbols with alternatives = recode native
    if (
      symbolsUsed.length <= threshold &&
      alternatives.length > 0 &&
      alternatives.length >= symbolsUsed.length * 0.5
    ) {
      this.logger.debug(
        `Package ${packageName} has ${symbolsUsed.length} symbols with ${alternatives.length} alternatives`
      );
      return { verdict: "RECODE_NATIVE" };
    }

    // Well-used across many files = keep (regardless of symbol count)
    // This handles UI component libraries like @radix-ui/* that export 1-2 symbols by design
    if (fileCount >= fileThreshold) {
      this.logger.debug(
        `Package ${packageName} used in ${fileCount} files (>= ${fileThreshold}), marking as KEEP`
      );
      return { verdict: "KEEP" };
    }

    // Few symbols but no alternatives = investigate with reason
    if (symbolsUsed.length <= 2 && alternatives.length === 0) {
      let investigateReason: InvestigateReason;
      if (fileCount === 1) {
        investigateReason = "SINGLE_FILE_USAGE";
      } else if (fileCount < fileThreshold) {
        investigateReason = "LOW_FILE_SPREAD";
      } else {
        investigateReason = "LOW_SYMBOL_COUNT";
      }
      this.logger.debug(
        `Package ${packageName} needs investigation: ${investigateReason}`
      );
      return { verdict: "INVESTIGATE", investigateReason };
    }

    // Well-used = keep
    this.logger.debug(`Package ${packageName} is well-used, marking as KEEP`);
    return { verdict: "KEEP" };
  }

  /**
   * Calculate confidence score for a verdict
   * @param context - Verdict context with all relevant information
   * @param verdictResult - The determined verdict
   * @returns Confidence score between 0 and 1
   */
  calculateConfidence(
    context: VerdictContext | VerdictCalculationContext,
    verdictResult: VerdictResult
  ): number {
    const { packageName, symbolsUsed, alternatives, peerDepInfo } = context;
    const { verdict } = verdictResult;

    // Check if Knip confirms our verdict
    const knipAnalysis = "knipAnalysis" in context ? context.knipAnalysis : undefined;
    const knipConfirms =
      knipAnalysis?.available &&
      (verdict === "REMOVE" || verdict === "PEER_DEP") &&
      (knipAnalysis.unusedDependencies.has(packageName) ||
        knipAnalysis.unusedDevDependencies.has(packageName));

    let confidence: number;

    switch (verdict) {
      case "REMOVE":
        confidence = 1.0; // Very confident if no imports
        break;

      case "PEER_DEP":
        // High confidence if we found packages that depend on it
        confidence = peerDepInfo && peerDepInfo.requiredBy.length > 0 ? 0.95 : 0.7;
        break;

      case "RECODE_NATIVE":
        // Higher confidence if all symbols have alternatives
        const coverage = alternatives.length / Math.max(symbolsUsed.length, 1);
        confidence = Math.min(0.5 + coverage * 0.5, 1.0);
        break;

      case "INVESTIGATE":
        confidence = 0.5; // Uncertain
        break;

      case "KEEP":
        confidence = 0.9; // Pretty confident
        break;

      case "CONSOLIDATE":
        confidence = 0.85; // Confident but user should review
        break;

      default:
        confidence = 0.5;
    }

    // Boost confidence if Knip confirms our verdict
    if (knipConfirms) {
      confidence = Math.min(confidence + 0.05, 1.0);
      this.logger.debug(
        `Knip confirms ${verdict} for ${packageName}, boosting confidence to ${confidence}`
      );
    }

    return confidence;
  }

  /**
   * Check if a verdict is actionable (requires user action)
   */
  isActionable(verdict: Verdict): boolean {
    return verdict !== "KEEP";
  }

  /**
   * Get priority for sorting verdicts (lower = more important)
   */
  getVerdictPriority(verdict: Verdict): number {
    const priority: Record<Verdict, number> = {
      REMOVE: 0,
      PEER_DEP: 1,
      RECODE_NATIVE: 2,
      CONSOLIDATE: 3,
      INVESTIGATE: 4,
      KEEP: 5,
    };
    return priority[verdict];
  }

  /**
   * Compare two verdicts for sorting
   */
  compareVerdicts(a: Verdict, b: Verdict): number {
    return this.getVerdictPriority(a) - this.getVerdictPriority(b);
  }

  /**
   * Get human-readable description for an investigate reason
   */
  getInvestigateReasonDescription(reason: InvestigateReason): string {
    const descriptions: Record<InvestigateReason, string> = {
      LOW_SYMBOL_COUNT: "Few symbols used, consider alternatives",
      SINGLE_FILE_USAGE: "Used in only one file, consider inlining",
      LOW_FILE_SPREAD: "Limited usage across files",
      UNKNOWN_PACKAGE: "Unknown usage pattern",
    };
    return descriptions[reason];
  }
}

// ============================================================================
// Default Instance (for backwards compatibility)
// ============================================================================

/**
 * Default verdict engine instance
 * @deprecated Use dependency injection with VerdictEngine constructor instead
 */
export const verdictEngine = new VerdictEngine();

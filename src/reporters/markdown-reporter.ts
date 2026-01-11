/**
 * Markdown Reporter
 * Generates markdown reports from analysis results
 */

import type {
  DependencyAnalysis,
  DuplicateGroup,
  InvestigateReason,
  ScanResult,
  Verdict,
} from "../types/index.js";
import { formatCount } from "../utils/format.js";

const INVESTIGATE_REASON_LABELS: Record<InvestigateReason, string> = {
  LOW_SYMBOL_COUNT: "low symbol count",
  SINGLE_FILE_USAGE: "single file usage",
  LOW_FILE_SPREAD: "low file spread",
  UNKNOWN_PACKAGE: "needs review",
};

const VERDICT_EMOJI: Record<Verdict, string> = {
  KEEP: "✅",
  RECODE_NATIVE: "🔄",
  CONSOLIDATE: "🔀",
  REMOVE: "🗑️",
  PEER_DEP: "🔗",
  INVESTIGATE: "🔍",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  KEEP: "Keep",
  RECODE_NATIVE: "Recode Native",
  CONSOLIDATE: "Consolidate",
  REMOVE: "Remove",
  PEER_DEP: "Peer Dep",
  INVESTIGATE: "Investigate",
};

export interface ReporterOptions {
  actionableOnly?: boolean;
}

export class MarkdownReporter {
  /**
   * Generate a full scan report
   */
  generateScanReport(result: ScanResult, options: ReporterOptions = {}): string {
    const { actionableOnly } = options;
    const lines: string[] = [];

    lines.push(`# Dependency Analysis Report`);
    if (actionableOnly) {
      lines.push("");
      lines.push(`> **Actionable items only** - INVESTIGATE verdicts are hidden`);
    }
    lines.push("");
    lines.push(`Generated: ${result.scannedAt}`);
    lines.push(`Project: ${result.projectPath}`);
    lines.push("");

    // Summary
    lines.push("## Summary");
    lines.push("");
    lines.push("| Category | Count |");
    lines.push("|----------|-------|");
    const displayedTotal = actionableOnly
      ? result.summary.total - result.summary.investigate
      : result.summary.total;
    lines.push(`| Total Dependencies | ${displayedTotal} |`);
    lines.push(`| ✅ Keep | ${result.summary.keep} |`);
    lines.push(`| 🔄 Recode Native | ${result.summary.recodeNative} |`);
    lines.push(`| 🔀 Consolidate | ${result.summary.consolidate} |`);
    lines.push(`| 🗑️ Remove | ${result.summary.remove} |`);
    lines.push(`| 🔗 Peer Dep | ${result.summary.peerDep} |`);
    if (!actionableOnly) {
      lines.push(`| 🔍 Investigate | ${result.summary.investigate} |`);
    }
    lines.push("");

    // Estimated Savings
    if (result.estimatedSavings.bundleKb > 0) {
      lines.push("### Estimated Savings");
      lines.push("");
      lines.push(`- **Bundle size**: ~${result.estimatedSavings.bundleKb}KB (gzipped)`);
      lines.push(`- **Dependencies**: ${result.estimatedSavings.dependencyCount} packages`);
      lines.push("");
    }

    // Duplicates
    if (result.duplicates.length > 0) {
      lines.push("## Duplicate Libraries Detected");
      lines.push("");
      for (const group of result.duplicates) {
        lines.push(this.formatDuplicateGroup(group));
      }
    }

    // Action Items - filter out INVESTIGATE if actionableOnly
    const actionItems = result.dependencies.filter((d) => {
      if (d.verdict === "KEEP") return false;
      if (actionableOnly && d.verdict === "INVESTIGATE") return false;
      return true;
    });

    if (actionItems.length > 0) {
      lines.push("## Action Items");
      lines.push("");

      // Remove
      const toRemove = actionItems.filter((d) => d.verdict === "REMOVE");
      if (toRemove.length > 0) {
        lines.push("### 🗑️ Remove (Unused)");
        lines.push("");
        for (const dep of toRemove) {
          lines.push(`- \`${dep.name}\` - No imports found`);
        }
        lines.push("");
      }

      // Peer Deps (redundant)
      const peerDeps = actionItems.filter((d) => d.verdict === "PEER_DEP");
      if (peerDeps.length > 0) {
        lines.push("### 🔗 Peer Dependencies (Redundant in package.json)");
        lines.push("");
        lines.push("These packages are not directly imported but are required by other dependencies.");
        lines.push("You can safely remove them from `package.json` - they will still be installed as peer dependencies.");
        lines.push("");
        for (const dep of peerDeps) {
          const requiredBy = dep.peerDepInfo?.requiredBy.join(", ") ?? "unknown";
          lines.push(`- \`${dep.name}\` - Required by: ${requiredBy}`);
        }
        lines.push("");
      }

      // Recode
      const toRecode = actionItems.filter((d) => d.verdict === "RECODE_NATIVE");
      if (toRecode.length > 0) {
        lines.push("### 🔄 Recode Native");
        lines.push("");
        for (const dep of toRecode) {
          lines.push(this.formatRecodeItem(dep));
        }
        lines.push("");
      }

      // Investigate (skip if actionableOnly)
      if (!actionableOnly) {
        const toInvestigate = actionItems.filter((d) => d.verdict === "INVESTIGATE");
        if (toInvestigate.length > 0) {
          lines.push("### 🔍 Investigate");
          lines.push("");
          for (const dep of toInvestigate) {
            const reasonLabel = dep.investigateReason
              ? ` *(${INVESTIGATE_REASON_LABELS[dep.investigateReason]})*`
              : "";
            lines.push(`- \`${dep.name}\` - ${formatCount(dep.totalSymbolsUsed, "symbol")} in ${formatCount(dep.fileCount, "file")}${reasonLabel}`);
          }
          lines.push("");
        }
      }
    }

    // Full Analysis Table - filter INVESTIGATE if actionableOnly
    const displayedDeps = actionableOnly
      ? result.dependencies.filter((d) => d.verdict !== "INVESTIGATE")
      : result.dependencies;

    lines.push("## Full Analysis");
    lines.push("");
    lines.push("| Package | Version | Symbols | Files | Import Style | Verdict |");
    lines.push("|---------|---------|---------|-------|--------------|---------|");

    for (const dep of displayedDeps) {
      const emoji = VERDICT_EMOJI[dep.verdict];
      const label = VERDICT_LABEL[dep.verdict];
      lines.push(
        `| \`${dep.name}\` | ${dep.version} | ${dep.totalSymbolsUsed} | ${dep.fileCount} | ${dep.importStyle} | ${emoji} ${label} |`
      );
    }
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Generate a single dependency analysis report
   */
  generateDependencyReport(analysis: DependencyAnalysis): string {
    const lines: string[] = [];

    const emoji = VERDICT_EMOJI[analysis.verdict];
    const label = VERDICT_LABEL[analysis.verdict];

    lines.push(`# ${analysis.name} Analysis`);
    lines.push("");
    lines.push(`**Version**: ${analysis.version}`);
    lines.push(`**Verdict**: ${emoji} ${label}`);
    lines.push(`**Confidence**: ${Math.round(analysis.confidence * 100)}%`);
    lines.push("");

    // Usage Stats
    lines.push("## Usage Statistics");
    lines.push("");
    lines.push(`- **Symbols Used**: ${analysis.totalSymbolsUsed}`);
    lines.push(`- **Files**: ${analysis.fileCount}`);
    lines.push(`- **Import Style**: ${analysis.importStyle}`);
    lines.push("");

    // Symbols Used
    if (analysis.symbolsUsed.length > 0) {
      lines.push("## Symbols Used");
      lines.push("");
      lines.push("| Symbol | Type | Count | Files |");
      lines.push("|--------|------|-------|-------|");

      for (const symbol of analysis.symbolsUsed) {
        const uniqueFiles = new Set(symbol.locations.map((l) => l.file)).size;
        lines.push(
          `| \`${symbol.symbol}\` | ${symbol.importType} | ${symbol.count} | ${uniqueFiles} |`
        );
      }
      lines.push("");
    }

    // Native Alternatives
    if (analysis.alternatives.length > 0) {
      lines.push("## Native Alternatives");
      lines.push("");

      for (const alt of analysis.alternatives) {
        lines.push(`### \`${alt.symbol}\``);
        lines.push("");
        lines.push(`**Native**: ${alt.native}`);
        if (alt.minEcmaVersion) {
          lines.push(`**Minimum ECMAScript**: ${alt.minEcmaVersion}`);
        }
        lines.push("");
        lines.push("```javascript");
        lines.push(alt.example);
        lines.push("```");
        lines.push("");

        if (alt.caveats && alt.caveats.length > 0) {
          lines.push("**Caveats**:");
          for (const caveat of alt.caveats) {
            lines.push(`- ${caveat}`);
          }
          lines.push("");
        }
      }
    }

    // File Locations
    if (analysis.files.length > 0 && analysis.files.length <= 20) {
      lines.push("## Files Using This Package");
      lines.push("");
      for (const file of analysis.files) {
        lines.push(`- \`${file}\``);
      }
      lines.push("");
    } else if (analysis.files.length > 20) {
      lines.push("## Files Using This Package");
      lines.push("");
      lines.push(`*${analysis.files.length} files (showing first 10)*`);
      lines.push("");
      for (const file of analysis.files.slice(0, 10)) {
        lines.push(`- \`${file}\``);
      }
      lines.push("- ...");
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Format a duplicate group for the report
   */
  private formatDuplicateGroup(group: DuplicateGroup): string {
    const lines: string[] = [];

    lines.push(`### ${group.category}: ${group.description}`);
    lines.push("");
    lines.push("| Library | Files | Symbols | Action |");
    lines.push("|---------|-------|---------|--------|");

    for (const lib of group.libraries) {
      const action =
        lib.recommendation === "keep"
          ? "✅ Keep"
          : lib.recommendation === "remove"
            ? "🗑️ Remove"
            : "➡️ Migrate";

      lines.push(`| \`${lib.name}\` | ${lib.fileCount} | ${lib.symbolCount} | ${action} |`);
    }
    lines.push("");

    lines.push(`**Recommendation**: Keep \`${group.recommendation.keep}\``);
    if (group.recommendation.migrate.length > 0) {
      lines.push(
        `**Migrate**: ${group.recommendation.migrate.map((m) => `\`${m}\``).join(", ")}`
      );
    }
    if (group.recommendation.remove.length > 0) {
      lines.push(
        `**Remove**: ${group.recommendation.remove.map((r) => `\`${r}\``).join(", ")}`
      );
    }
    lines.push(
      `**Potential Savings**: ~${group.potentialSavings.bundleKb}KB, ${group.potentialSavings.dependencyCount} dependencies`
    );
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Format a recode native item
   */
  private formatRecodeItem(dep: DependencyAnalysis): string {
    const lines: string[] = [];

    lines.push(`#### \`${dep.name}\``);
    lines.push("");
    lines.push(`- **Symbols used**: ${dep.symbolsUsed.map((s) => `\`${s.symbol}\``).join(", ")}`);
    lines.push(`- **Files**: ${dep.fileCount}`);

    if (dep.alternatives.length > 0) {
      lines.push("- **Alternatives**:");
      for (const alt of dep.alternatives.slice(0, 3)) {
        lines.push(`  - \`${alt.symbol}\` → ${alt.native}`);
      }
    }
    lines.push("");

    return lines.join("\n");
  }
}

export const markdownReporter = new MarkdownReporter();

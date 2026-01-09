/**
 * Console Reporter
 * Outputs analysis results to console with colors
 */

import pc from "picocolors";
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

function formatInvestigateReason(reason: InvestigateReason): string {
  return INVESTIGATE_REASON_LABELS[reason] ?? reason;
}

const VERDICT_COLOR: Record<Verdict, (s: string) => string> = {
  KEEP: pc.green,
  RECODE_NATIVE: pc.yellow,
  CONSOLIDATE: pc.cyan,
  REMOVE: pc.red,
  PEER_DEP: pc.blue,
  INVESTIGATE: pc.magenta,
};

const VERDICT_SYMBOL: Record<Verdict, string> = {
  KEEP: "✓",
  RECODE_NATIVE: "↻",
  CONSOLIDATE: "⇄",
  REMOVE: "✗",
  PEER_DEP: "⊕",
  INVESTIGATE: "?",
};

export class ConsoleReporter {
  /**
   * Print scan summary
   */
  printScanSummary(result: ScanResult): void {
    console.log("");
    console.log(pc.bold("═══════════════════════════════════════════"));
    console.log(pc.bold("  dep-scope Analysis Report"));
    console.log(pc.bold("═══════════════════════════════════════════"));
    console.log("");

    // Summary counts
    console.log(pc.bold("Summary:"));
    console.log(`  Total dependencies: ${pc.bold(String(result.summary.total))}`);
    console.log(`  ${pc.green("✓")} Keep:          ${result.summary.keep}`);
    console.log(`  ${pc.yellow("↻")} Recode Native: ${result.summary.recodeNative}`);
    console.log(`  ${pc.cyan("⇄")} Consolidate:   ${result.summary.consolidate}`);
    console.log(`  ${pc.red("✗")} Remove:        ${result.summary.remove}`);
    console.log(`  ${pc.blue("⊕")} Peer Dep:      ${result.summary.peerDep}`);
    console.log(`  ${pc.magenta("?")} Investigate:   ${result.summary.investigate}`);
    console.log("");

    // Estimated savings
    if (result.estimatedSavings.bundleKb > 0) {
      console.log(pc.bold("Estimated Savings:"));
      console.log(`  Bundle: ${pc.green(`~${result.estimatedSavings.bundleKb}KB`)} (gzipped)`);
      console.log(`  Dependencies: ${pc.green(String(result.estimatedSavings.dependencyCount))}`);
      console.log("");
    }
  }

  /**
   * Print duplicate groups
   */
  printDuplicates(duplicates: DuplicateGroup[]): void {
    if (duplicates.length === 0) return;

    console.log(pc.bold("Duplicate Libraries:"));
    console.log("");

    for (const group of duplicates) {
      console.log(`  ${pc.cyan(group.category)}: ${group.description}`);

      for (const lib of group.libraries) {
        const icon =
          lib.recommendation === "keep"
            ? pc.green("✓")
            : lib.recommendation === "remove"
              ? pc.red("✗")
              : pc.yellow("→");

        console.log(
          `    ${icon} ${lib.name.padEnd(25)} ${String(lib.fileCount).padStart(3)} files`
        );
      }

      console.log(
        `    ${pc.dim(`Savings: ~${group.potentialSavings.bundleKb}KB`)}`
      );
      console.log("");
    }
  }

  /**
   * Print action items
   */
  printActionItems(dependencies: DependencyAnalysis[]): void {
    const actionItems = dependencies.filter((d) => d.verdict !== "KEEP");
    if (actionItems.length === 0) {
      console.log(pc.green("No action items - all dependencies are well-used!"));
      console.log("");
      return;
    }

    console.log(pc.bold("Action Items:"));
    console.log("");

    // Remove
    const toRemove = actionItems.filter((d) => d.verdict === "REMOVE");
    if (toRemove.length > 0) {
      console.log(`  ${pc.red("Remove (unused):")}`);
      for (const dep of toRemove) {
        console.log(`    ${pc.red("✗")} ${dep.name}`);
      }
      console.log("");
    }

    // Peer Deps (redundant in package.json)
    const peerDeps = actionItems.filter((d) => d.verdict === "PEER_DEP");
    if (peerDeps.length > 0) {
      console.log(`  ${pc.blue("Peer deps (redundant in package.json):")}`);
      for (const dep of peerDeps) {
        const requiredBy = dep.peerDepInfo?.requiredBy.slice(0, 3).join(", ") ?? "unknown";
        const more = (dep.peerDepInfo?.requiredBy.length ?? 0) > 3 ? ", ..." : "";
        console.log(
          `    ${pc.blue("⊕")} ${dep.name} ${pc.dim(`← required by: ${requiredBy}${more}`)}`
        );
      }
      console.log("");
    }

    // Recode
    const toRecode = actionItems.filter((d) => d.verdict === "RECODE_NATIVE");
    if (toRecode.length > 0) {
      console.log(`  ${pc.yellow("Recode to native:")}`);
      for (const dep of toRecode) {
        const symbols = dep.symbolsUsed
          .slice(0, 3)
          .map((s) => s.symbol)
          .join(", ");
        console.log(
          `    ${pc.yellow("↻")} ${dep.name} (${formatCount(dep.totalSymbolsUsed, "symbol")}: ${symbols})`
        );
      }
      console.log("");
    }

    // Investigate
    const toInvestigate = actionItems.filter((d) => d.verdict === "INVESTIGATE");
    if (toInvestigate.length > 0) {
      console.log(`  ${pc.magenta("Investigate:")}`);
      for (const dep of toInvestigate) {
        const reason = dep.investigateReason
          ? pc.dim(` [${formatInvestigateReason(dep.investigateReason)}]`)
          : "";
        console.log(
          `    ${pc.magenta("?")} ${dep.name} (${formatCount(dep.totalSymbolsUsed, "symbol")} in ${formatCount(dep.fileCount, "file")})${reason}`
        );
      }
      console.log("");
    }
  }

  /**
   * Print single dependency analysis
   */
  printDependencyAnalysis(analysis: DependencyAnalysis): void {
    const color = VERDICT_COLOR[analysis.verdict];
    const symbol = VERDICT_SYMBOL[analysis.verdict];

    console.log("");
    console.log(pc.bold("═══════════════════════════════════════════"));
    console.log(pc.bold(`  ${analysis.name} ${pc.dim(`v${analysis.version}`)}`));
    console.log(pc.bold("═══════════════════════════════════════════"));
    console.log("");

    console.log(`Verdict: ${color(`${symbol} ${analysis.verdict}`)}`);
    console.log(`Confidence: ${Math.round(analysis.confidence * 100)}%`);
    console.log("");

    console.log(pc.bold("Usage:"));
    console.log(`  Symbols: ${analysis.totalSymbolsUsed}`);
    console.log(`  Files: ${analysis.fileCount}`);
    console.log(`  Import style: ${analysis.importStyle}`);
    console.log("");

    if (analysis.symbolsUsed.length > 0) {
      console.log(pc.bold("Symbols Used:"));
      for (const symbol of analysis.symbolsUsed.slice(0, 10)) {
        console.log(
          `  ${pc.cyan(symbol.symbol.padEnd(20))} ${String(symbol.count).padStart(3)}x in ${new Set(symbol.locations.map((l) => l.file)).size} files`
        );
      }
      if (analysis.symbolsUsed.length > 10) {
        console.log(pc.dim(`  ... and ${analysis.symbolsUsed.length - 10} more`));
      }
      console.log("");
    }

    if (analysis.alternatives.length > 0) {
      console.log(pc.bold("Native Alternatives:"));
      for (const alt of analysis.alternatives.slice(0, 5)) {
        console.log(`  ${pc.yellow(alt.symbol)} → ${alt.native}`);
      }
      console.log("");
    }
  }

  /**
   * Print a simple table of all dependencies
   */
  printDependencyTable(dependencies: DependencyAnalysis[]): void {
    console.log("");
    console.log(
      pc.bold(
        "Package".padEnd(30) +
          "Version".padEnd(12) +
          "Symbols".padEnd(10) +
          "Files".padEnd(8) +
          "Verdict"
      )
    );
    console.log(pc.dim("─".repeat(75)));

    for (const dep of dependencies) {
      const color = VERDICT_COLOR[dep.verdict];
      const symbol = VERDICT_SYMBOL[dep.verdict];

      console.log(
        dep.name.padEnd(30) +
          dep.version.padEnd(12) +
          String(dep.totalSymbolsUsed).padEnd(10) +
          String(dep.fileCount).padEnd(8) +
          color(`${symbol} ${dep.verdict}`)
      );
    }
    console.log("");
  }
}

export const consoleReporter = new ConsoleReporter();

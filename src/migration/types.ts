/**
 * Migration Module Types
 * Contracts for LLM-ready migration prompt generation
 */

export interface MigrationContext {
  /** Resolved TypeScript target, e.g. "ES2022" */
  tsconfigTarget: string;
  /** Detected framework */
  framework?: "react" | "nextjs" | "node" | "unknown";
  /** Import style detected for this package */
  importStyle: "barrel" | "direct" | "mixed";
  /** Absolute path to the project root */
  projectPath: string;
  /** Detected package manager ("npm" | "pnpm" | "yarn" | "bun"), defaults to "npm" */
  packageManager?: "npm" | "pnpm" | "yarn" | "bun";
}

export interface SymbolMigrationRule {
  /** The imported symbol name, e.g. "debounce" */
  symbol: string;
  /** Short description of the native replacement, e.g. "Custom debounce (ES6)" */
  nativeReplacement: string;
  /** Ready-to-paste code example */
  example: string;
  /** Minimum ECMAScript version required, e.g. "ES2022" */
  minEcmaVersion: string;
  /** Known limitations of the native approach */
  caveats: string[];
  /**
   * Fallback if the project target is below minEcmaVersion.
   * Shown in the prompt instead of the primary example.
   */
  polyfillFallback?: string;
}

export interface MigrationTemplate {
  /** npm package name this template covers */
  packageName: string;
  /** Per-symbol migration rules (key = symbol name, "default" = catch-all) */
  symbols: Record<string, SymbolMigrationRule>;
  /** Caveats that apply to the whole package migration */
  globalCaveats?: string[];
}

export interface MigrationOutput {
  /** Full markdown content ready to paste into Claude Code / any LLM */
  markdown: string;
  /** Suggested output path, e.g. ".dep-scope/migrate-lodash.md" */
  outputPath: string;
  /** Metadata for programmatic consumers */
  metadata: {
    packageName: string;
    symbolCount: number;
    fileCount: number;
    targetEcmaVersion: string;
  };
}

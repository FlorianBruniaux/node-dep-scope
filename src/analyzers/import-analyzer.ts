/**
 * Import Analyzer
 * Parses TypeScript/JavaScript files to extract import information
 * Supports: static imports, dynamic imports, require()
 */

import { parse } from "@typescript-eslint/parser";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import type { ImportInfo, ImportType, Location, IFileSystem, ILogger, IFileAnalysisCache } from "../types/index.js";
import { NodeFileSystem } from "../utils/filesystem.js";
import { ConsoleLogger } from "../utils/logger.js";
import { FileAnalysisCache } from "../utils/cache.js";

/**
 * Import Analyzer Dependencies
 */
export interface ImportAnalyzerDependencies {
  fileSystem?: IFileSystem;
  logger?: ILogger;
  cache?: IFileAnalysisCache;
}

/**
 * Import Analyzer Options
 */
export interface ImportAnalyzerOptions {
  /** Enable caching of analysis results (default: true) */
  enableCache?: boolean;
}

export class ImportAnalyzer {
  private readonly fileSystem: IFileSystem;
  private readonly logger: ILogger;
  private readonly cache: IFileAnalysisCache;
  private readonly enableCache: boolean;

  constructor(
    options: ImportAnalyzerOptions = {},
    deps: ImportAnalyzerDependencies = {}
  ) {
    this.fileSystem = deps.fileSystem ?? new NodeFileSystem();
    this.logger = deps.logger ?? new ConsoleLogger();
    this.cache = deps.cache ?? new FileAnalysisCache({ logger: this.logger });
    this.enableCache = options.enableCache ?? true;
  }

  /**
   * Analyze a single file and extract all imports
   * Uses mtime-based caching for performance optimization
   */
  async analyzeFile(filePath: string): Promise<ImportInfo[]> {
    // Try cache first if enabled
    if (this.enableCache) {
      const stats = await this.fileSystem.stat(filePath);
      const mtime = stats.mtime;

      const cached = this.cache.getIfValid(filePath, mtime);
      if (cached !== undefined) {
        return cached;
      }

      // Cache miss - parse and store
      const content = await this.fileSystem.readFile(filePath, "utf-8");
      const imports = this.analyzeContent(content, filePath);
      this.cache.setWithMtime(filePath, imports, mtime);
      return imports;
    }

    // No caching - direct parse
    const content = await this.fileSystem.readFile(filePath, "utf-8");
    return this.analyzeContent(content, filePath);
  }

  /**
   * Get cache statistics (for monitoring/debugging)
   */
  getCacheStats(): { hits: number; misses: number; size: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * Clear the analysis cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Decide whether to enable JSX parsing for this file.
   *
   * `.tsx`/`.jsx` always enable JSX. Pure `.ts` files disable JSX to avoid
   * conflicts between JSX tags and TypeScript generics (e.g. `async <T>(x) => ...`
   * is parsed as a JSX opening tag when `jsx: true`, causing
   * "Unexpected token. Did you mean `{'>'}` or `&gt;`?" errors).
   *
   * Matches TypeScript's native `--jsx` behavior (only `.tsx`).
   */
  private shouldEnableJsx(filePath: string): boolean {
    if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) return true;
    if (filePath.endsWith(".ts")) return false;
    // .js / .mjs / .cjs / other: keep JSX enabled (no TS-generics conflict possible)
    return true;
  }

  /**
   * Analyze content string and extract all imports
   */
  analyzeContent(content: string, filePath: string): ImportInfo[] {
    const imports: ImportInfo[] = [];

    try {
      const ast = parse(content, {
        sourceType: "module",
        ecmaVersion: "latest",
        jsx: this.shouldEnableJsx(filePath),
        loc: true,
        range: true,
      });

      this.traverseNode(ast, imports, filePath);
    } catch (error) {
      // Skip files that can't be parsed (e.g., invalid syntax)
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Warning: Could not parse ${filePath}: ${msg}`);
    }

    return imports;
  }

  /**
   * Traverse AST node and collect imports
   */
  private traverseNode(
    node: TSESTree.Node | TSESTree.Program,
    imports: ImportInfo[],
    filePath: string
  ): void {
    if (!node || typeof node !== "object") return;

    // Handle different node types
    if ("type" in node) {
      switch (node.type) {
        case AST_NODE_TYPES.ImportDeclaration:
          imports.push(...this.processImportDeclaration(node, filePath));
          break;

        case AST_NODE_TYPES.ImportExpression:
          const dynamicImport = this.processDynamicImport(node, filePath);
          if (dynamicImport) imports.push(dynamicImport);
          break;

        case AST_NODE_TYPES.CallExpression:
          const requireImport = this.processRequireCall(node, filePath);
          if (requireImport) imports.push(requireImport);
          break;
      }
    }

    // Recursively traverse child nodes
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "range" || key === "parent") continue;

      const child = (node as unknown as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === "object" && "type" in item) {
            this.traverseNode(item as TSESTree.Node, imports, filePath);
          }
        }
      } else if (child && typeof child === "object" && "type" in child) {
        this.traverseNode(child as TSESTree.Node, imports, filePath);
      }
    }
  }

  /**
   * Process a static import declaration
   */
  private processImportDeclaration(
    node: TSESTree.ImportDeclaration,
    filePath: string
  ): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const source = node.source.value as string;

    // Skip relative imports
    if (source.startsWith(".") || source.startsWith("/")) {
      return imports;
    }

    const packageName = this.extractPackageName(source);
    const location: Location = {
      file: filePath,
      line: node.loc?.start.line ?? 0,
      column: node.loc?.start.column ?? 0,
    };

    // Side-effect import: import 'package'
    if (node.specifiers.length === 0) {
      imports.push({
        packageName,
        importPath: source,
        symbol: "*",
        importType: "side-effect",
        location,
      });
      return imports;
    }

    for (const specifier of node.specifiers) {
      imports.push({
        packageName,
        importPath: source,
        symbol: this.getSymbolName(specifier),
        importType: this.getImportType(specifier),
        location: {
          ...location,
          line: specifier.loc?.start.line ?? location.line,
          column: specifier.loc?.start.column ?? location.column,
        },
      });
    }

    return imports;
  }

  /**
   * Process dynamic import: import('package')
   */
  private processDynamicImport(
    node: TSESTree.ImportExpression,
    filePath: string
  ): ImportInfo | null {
    // Only handle string literals
    if (node.source.type !== AST_NODE_TYPES.Literal) {
      return null;
    }

    const source = node.source.value;
    if (typeof source !== "string") return null;

    // Skip relative imports
    if (source.startsWith(".") || source.startsWith("/")) {
      return null;
    }

    const packageName = this.extractPackageName(source);

    return {
      packageName,
      importPath: source,
      symbol: "*",
      importType: "namespace", // Dynamic imports return the module namespace
      location: {
        file: filePath,
        line: node.loc?.start.line ?? 0,
        column: node.loc?.start.column ?? 0,
      },
    };
  }

  /**
   * Process require call: require('package')
   */
  private processRequireCall(
    node: TSESTree.CallExpression,
    filePath: string
  ): ImportInfo | null {
    // Check if it's a require call
    if (
      node.callee.type !== AST_NODE_TYPES.Identifier ||
      node.callee.name !== "require"
    ) {
      return null;
    }

    // Must have exactly one argument
    if (node.arguments.length !== 1) {
      return null;
    }

    const arg = node.arguments[0];

    // Only handle string literals
    if (arg.type !== AST_NODE_TYPES.Literal || typeof arg.value !== "string") {
      return null;
    }

    const source = arg.value;

    // Skip relative imports
    if (source.startsWith(".") || source.startsWith("/")) {
      return null;
    }

    const packageName = this.extractPackageName(source);

    return {
      packageName,
      importPath: source,
      symbol: "*",
      importType: "namespace", // require returns the full module
      location: {
        file: filePath,
        line: node.loc?.start.line ?? 0,
        column: node.loc?.start.column ?? 0,
      },
    };
  }

  /**
   * Extract package name from import path
   * @example "@scope/package/path" → "@scope/package"
   * @example "package/path" → "package"
   */
  extractPackageName(source: string): string {
    if (source.startsWith("@")) {
      const parts = source.split("/");
      if (parts.length >= 2) {
        return `${parts[0]}/${parts[1]}`;
      }
      return source;
    }
    return source.split("/")[0];
  }

  /**
   * Get the imported symbol name
   */
  private getSymbolName(specifier: TSESTree.ImportClause): string {
    switch (specifier.type) {
      case AST_NODE_TYPES.ImportDefaultSpecifier:
        return "default";
      case AST_NODE_TYPES.ImportNamespaceSpecifier:
        return "*";
      case AST_NODE_TYPES.ImportSpecifier:
        // Use imported name, not local alias
        return specifier.imported.type === AST_NODE_TYPES.Identifier
          ? specifier.imported.name
          : specifier.imported.value;
      default:
        return "unknown";
    }
  }

  /**
   * Determine the type of import
   */
  private getImportType(specifier: TSESTree.ImportClause): ImportType {
    switch (specifier.type) {
      case AST_NODE_TYPES.ImportDefaultSpecifier:
        return "default";
      case AST_NODE_TYPES.ImportNamespaceSpecifier:
        return "namespace";
      case AST_NODE_TYPES.ImportSpecifier:
        return "named";
      default:
        return "side-effect";
    }
  }

  /**
   * Determine import style based on import path
   */
  determineImportStyle(
    importPath: string,
    packageName: string
  ): "barrel" | "direct" {
    // If import path equals package name, it's a barrel import
    // e.g., "lodash" vs "lodash/get"
    if (importPath === packageName) {
      return "barrel";
    }
    return "direct";
  }
}

// ============================================================================
// Default Instance (for backwards compatibility)
// ============================================================================

/**
 * Default import analyzer instance
 * @deprecated Use dependency injection with ImportAnalyzer constructor instead
 */
export const importAnalyzer = new ImportAnalyzer();

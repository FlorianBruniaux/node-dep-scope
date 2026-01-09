/**
 * Import Analyzer
 * Parses TypeScript/JavaScript files to extract import information
 * Supports: static imports, dynamic imports, require()
 */

import { parse } from "@typescript-eslint/parser";
import { AST_NODE_TYPES } from "@typescript-eslint/types";
import type { TSESTree } from "@typescript-eslint/types";
import * as fs from "node:fs/promises";
import type { ImportInfo, ImportType, Location } from "../types/index.js";

export class ImportAnalyzer {
  /**
   * Analyze a single file and extract all imports
   */
  async analyzeFile(filePath: string): Promise<ImportInfo[]> {
    const content = await fs.readFile(filePath, "utf-8");
    return this.analyzeContent(content, filePath);
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
        jsx: true,
        loc: true,
        range: true,
      });

      this.traverseNode(ast, imports, filePath);
    } catch (error) {
      // Skip files that can't be parsed (e.g., invalid syntax)
      console.warn(`Warning: Could not parse ${filePath}`);
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

export const importAnalyzer = new ImportAnalyzer();

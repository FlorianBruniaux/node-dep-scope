import * as fs from "node:fs/promises";
import { parse } from "@typescript-eslint/parser";
import type { TSESTree } from "@typescript-eslint/types";

export interface StringLiteralLocation {
  value: string;
  line: number;
  column: number;
}

/**
 * Parse a JS/TS/MJS/CJS config file and return all string literal values with locations.
 * Returns empty array on parse failure (safe to ignore broken configs).
 */
export async function extractStringLiterals(
  filePath: string
): Promise<StringLiteralLocation[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const results: StringLiteralLocation[] = [];

  try {
    const ast = parse(content, {
      sourceType: "module",
      ecmaVersion: "latest",
      jsx: filePath.endsWith(".tsx") || filePath.endsWith(".jsx"),
      loc: true,
      range: true,
    });

    collectLiterals(ast as unknown as TSESTree.Node, results);
  } catch {
    // Ignore unparseable configs
  }

  return results;
}

function collectLiterals(
  node: TSESTree.Node | TSESTree.Program,
  out: StringLiteralLocation[]
): void {
  if (!node || typeof node !== "object") return;

  if ("type" in node && node.type === "Literal") {
    const lit = node as TSESTree.Literal;
    if (typeof lit.value === "string" && lit.loc) {
      out.push({
        value: lit.value,
        line: lit.loc.start.line,
        column: lit.loc.start.column,
      });
    }
    return;
  }

  for (const key of Object.keys(node)) {
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && "type" in item) {
          collectLiterals(item as TSESTree.Node, out);
        }
      }
    } else if (child && typeof child === "object" && "type" in child) {
      collectLiterals(child as TSESTree.Node, out);
    }
  }
}

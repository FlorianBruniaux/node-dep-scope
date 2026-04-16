import { describe, it, expect } from "vitest";
import { generateMigration } from "../../src/migration/generator.js";
import { lodashTemplate } from "../../src/migration/templates/lodash.js";
import type { DependencyAnalysis } from "../../src/types/index.js";
import type { MigrationContext } from "../../src/migration/types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeAnalysis(overrides: Partial<DependencyAnalysis> = {}): DependencyAnalysis {
  return {
    name: "lodash",
    version: "^4.17.21",
    importStyle: "barrel",
    symbolsUsed: [
      {
        symbol: "debounce",
        importType: "named",
        count: 3,
        locations: [
          { file: "/project/src/hooks/useSearch.ts", line: 12, column: 0 },
          { file: "/project/src/components/Input.tsx", line: 8, column: 0 },
          { file: "/project/src/utils/api.ts", line: 45, column: 0 },
        ],
      },
      {
        symbol: "cloneDeep",
        importType: "named",
        count: 2,
        locations: [
          { file: "/project/src/store/reducer.ts", line: 23, column: 0 },
          { file: "/project/src/utils/merge.ts", line: 67, column: 0 },
        ],
      },
    ],
    totalSymbolsUsed: 2,
    verdict: "RECODE_NATIVE",
    confidence: 0.9,
    alternatives: [],
    files: [
      "/project/src/hooks/useSearch.ts",
      "/project/src/components/Input.tsx",
      "/project/src/utils/api.ts",
      "/project/src/store/reducer.ts",
      "/project/src/utils/merge.ts",
    ],
    fileCount: 5,
    ...overrides,
  };
}

function makeContext(overrides: Partial<MigrationContext> = {}): MigrationContext {
  return {
    tsconfigTarget: "ES2022",
    framework: "react",
    importStyle: "barrel",
    projectPath: "/project",
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// generateMigration — structure
// ─────────────────────────────────────────────────────────────────────────────

describe("generateMigration", () => {
  it("returns a MigrationOutput with expected metadata", () => {
    const output = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);

    expect(output.metadata.packageName).toBe("lodash");
    expect(output.metadata.symbolCount).toBe(2);
    expect(output.metadata.fileCount).toBe(5);
    expect(output.metadata.targetEcmaVersion).toBe("ES2022");
  });

  it("returns a default output path in .dep-scope/", () => {
    const output = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(output.outputPath).toBe(".dep-scope/migrate-lodash.md");
  });

  it("sanitizes scoped package names in output path", () => {
    const analysis = makeAnalysis({ name: "@org/my-pkg" });
    const output = generateMigration(analysis, makeContext(), lodashTemplate);
    expect(output.outputPath).toContain("migrate-");
    expect(output.outputPath).not.toContain("@");
  });

  // ─── Markdown content ───────────────────────────────────────────────────

  it("markdown contains the package name in the header", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(markdown).toContain("Migrate away from `lodash`");
  });

  it("markdown contains audit summary with correct values", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(markdown).toContain("ES2022");
    expect(markdown).toContain("react");
    expect(markdown).toContain("barrel");
  });

  it("markdown contains refactoring plan for each used symbol", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(markdown).toContain("Replace `debounce`");
    expect(markdown).toContain("Replace `cloneDeep`");
  });

  it("markdown includes file locations for symbols", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(markdown).toContain("useSearch.ts");
    expect(markdown).toContain("reducer.ts");
  });

  it("markdown contains verification checklist", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(markdown).toContain("Verification checklist");
    expect(markdown).toContain("npm run build");
    expect(markdown).toContain("npm test");
  });

  it("markdown contains rollback instructions", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(markdown).toContain("Rollback");
    expect(markdown).toContain("git checkout main");
  });

  it("markdown contains steps to uninstall the package", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(markdown).toContain("npm uninstall lodash");
  });

  // ─── ES target awareness ─────────────────────────────────────────────────

  it("uses structuredClone for cloneDeep when target >= ES2022", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext({ tsconfigTarget: "ES2022" }), lodashTemplate);
    expect(markdown).toContain("structuredClone");
    expect(markdown).not.toContain("JSON.parse(JSON.stringify");
  });

  it("uses polyfill fallback for cloneDeep when target < ES2022", () => {
    const { markdown } = generateMigration(
      makeAnalysis(),
      makeContext({ tsconfigTarget: "ES2019" }),
      lodashTemplate
    );
    expect(markdown).toContain("JSON.parse(JSON.stringify");
  });

  // ─── No template symbols ─────────────────────────────────────────────────

  it("generates generic section when no symbols match template", () => {
    const analysis = makeAnalysis({
      symbolsUsed: [
        {
          symbol: "someObscureHelper",
          importType: "named",
          count: 1,
          locations: [{ file: "/project/src/utils.ts", line: 5, column: 0 }],
        },
      ],
      totalSymbolsUsed: 1,
    });

    // Use a template that has no specific rule for "someObscureHelper"
    // but has a "default" catch-all — which the generator resolves
    const { markdown } = generateMigration(analysis, makeContext(), lodashTemplate);
    // Should still produce valid markdown with header and checklist
    expect(markdown).toContain("Migrate away from");
    expect(markdown).toContain("Verification checklist");
  });

  // ─── Global caveats ──────────────────────────────────────────────────────

  it("includes global caveats from the template", () => {
    const { markdown } = generateMigration(makeAnalysis(), makeContext(), lodashTemplate);
    expect(markdown).toContain("General notes");
    expect(markdown).toContain("test suite");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// lodash template
// ─────────────────────────────────────────────────────────────────────────────

describe("lodashTemplate", () => {
  it("has rules for the 4 core symbols", () => {
    expect(lodashTemplate.symbols["debounce"]).toBeDefined();
    expect(lodashTemplate.symbols["throttle"]).toBeDefined();
    expect(lodashTemplate.symbols["cloneDeep"]).toBeDefined();
    expect(lodashTemplate.symbols["isEqual"]).toBeDefined();
  });

  it("has a catch-all default rule", () => {
    expect(lodashTemplate.symbols["default"]).toBeDefined();
  });

  it("cloneDeep has a polyfill fallback for old targets", () => {
    expect(lodashTemplate.symbols["cloneDeep"].polyfillFallback).toBeDefined();
    expect(lodashTemplate.symbols["cloneDeep"].polyfillFallback).toContain("JSON.parse");
  });

  it("debounce targets ES6 minimum", () => {
    expect(lodashTemplate.symbols["debounce"].minEcmaVersion).toBe("ES6");
  });

  it("cloneDeep targets ES2022 minimum", () => {
    expect(lodashTemplate.symbols["cloneDeep"].minEcmaVersion).toBe("ES2022");
  });
});

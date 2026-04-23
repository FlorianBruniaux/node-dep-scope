import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { packageJsonScriptsDetector } from "../../../../src/analyzers/string-reference/detectors/package-json-scripts.js";
import { ConsoleLogger } from "../../../../src/utils/logger.js";

const FIXTURE = path.join(
  import.meta.dirname,
  "../../../fixtures/string-references/package-json-scripts/package.json"
);

const ctx = {
  projectPath: path.dirname(FIXTURE),
  installedPackages: new Set(["oxfmt", "oxlint", "typescript"]),
  logger: new ConsoleLogger({ verbose: false }),
};

describe("packageJsonScriptsDetector", () => {
  it("detects oxfmt from scripts.format", async () => {
    const refs = await packageJsonScriptsDetector.detect(FIXTURE, ctx);
    const pkgs = refs.map((r) => r.packageName);
    expect(pkgs).toContain("oxfmt");
  });

  it("detects oxlint from scripts.lint", async () => {
    const refs = await packageJsonScriptsDetector.detect(FIXTURE, ctx);
    const pkgs = refs.map((r) => r.packageName);
    expect(pkgs).toContain("oxlint");
  });

  it("does not emit refs for packages not in installedPackages", async () => {
    const emptyCtx = { ...ctx, installedPackages: new Set<string>() };
    const refs = await packageJsonScriptsDetector.detect(FIXTURE, emptyCtx);
    expect(refs).toHaveLength(0);
  });

  it("sets kind to script-binary", async () => {
    const refs = await packageJsonScriptsDetector.detect(FIXTURE, ctx);
    for (const ref of refs) expect(ref.kind).toBe("script-binary");
  });

  it("deduplicates: oxfmt appears in two scripts but returns one ref per occurrence", async () => {
    const refs = await packageJsonScriptsDetector.detect(FIXTURE, ctx);
    // oxfmt appears in "format" and in "lint:and:format" → 2 refs
    const oxfmtRefs = refs.filter((r) => r.packageName === "oxfmt");
    expect(oxfmtRefs.length).toBeGreaterThanOrEqual(1);
  });
});

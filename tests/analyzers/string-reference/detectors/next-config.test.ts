import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { nextConfigDetector } from "../../../../src/analyzers/string-reference/detectors/next-config.js";
import { ConsoleLogger } from "../../../../src/utils/logger.js";

const FIXTURE_DIR = path.join(
  import.meta.dirname,
  "../../../fixtures/string-references/next-config"
);
const FIXTURE = path.join(FIXTURE_DIR, "next.config.mjs");

const ctx = {
  projectPath: FIXTURE_DIR,
  installedPackages: new Set(["@svgr/webpack", "next"]),
  logger: new ConsoleLogger({ verbose: false }),
};

describe("nextConfigDetector", () => {
  it("detects @svgr/webpack from turbopack loaders", async () => {
    const refs = await nextConfigDetector.detect(FIXTURE, ctx);
    expect(refs.map((r) => r.packageName)).toContain("@svgr/webpack");
  });

  it("does not emit refs for packages not in installedPackages", async () => {
    const emptyCtx = { ...ctx, installedPackages: new Set<string>() };
    const refs = await nextConfigDetector.detect(FIXTURE, emptyCtx);
    expect(refs).toHaveLength(0);
  });
});

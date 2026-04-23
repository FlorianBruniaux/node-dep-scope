import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { vitestConfigDetector } from "../../../../src/analyzers/string-reference/detectors/vitest-config.js";
import { ConsoleLogger } from "../../../../src/utils/logger.js";

const FIXTURE_DIR = path.join(
  import.meta.dirname,
  "../../../fixtures/string-references/vitest-config"
);
const FIXTURE = path.join(FIXTURE_DIR, "vitest.config.ts");

const ctx = {
  projectPath: FIXTURE_DIR,
  installedPackages: new Set(["jsdom", "@testing-library/jest-dom", "vitest"]),
  logger: new ConsoleLogger({ verbose: false }),
};

describe("vitestConfigDetector", () => {
  it("detects jsdom from environment string", async () => {
    const refs = await vitestConfigDetector.detect(FIXTURE, ctx);
    expect(refs.map((r) => r.packageName)).toContain("jsdom");
  });

  it("detects @testing-library/jest-dom from setupFiles array", async () => {
    const refs = await vitestConfigDetector.detect(FIXTURE, ctx);
    expect(refs.map((r) => r.packageName)).toContain("@testing-library/jest-dom");
  });

  it("does not emit refs for packages not in installedPackages", async () => {
    const emptyCtx = { ...ctx, installedPackages: new Set<string>() };
    const refs = await vitestConfigDetector.detect(FIXTURE, emptyCtx);
    expect(refs).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { viteConfigDetector } from "../../../../src/analyzers/string-reference/detectors/vite-config.js";
import { ConsoleLogger } from "../../../../src/utils/logger.js";

const FIXTURE_DIR = path.join(
  import.meta.dirname,
  "../../../fixtures/string-references/vite-config"
);
const FIXTURE = path.join(FIXTURE_DIR, "vite.config.ts");

const ctx = {
  projectPath: FIXTURE_DIR,
  installedPackages: new Set(["@vitejs/plugin-vue", "vite"]),
  logger: new ConsoleLogger({ verbose: false }),
};

describe("viteConfigDetector", () => {
  it("detects @vitejs/plugin-vue from plugins array", async () => {
    const refs = await viteConfigDetector.detect(FIXTURE, ctx);
    expect(refs.map((r) => r.packageName)).toContain("@vitejs/plugin-vue");
  });

  it("does not emit refs for packages not in installedPackages", async () => {
    const emptyCtx = { ...ctx, installedPackages: new Set<string>() };
    const refs = await viteConfigDetector.detect(FIXTURE, emptyCtx);
    expect(refs).toHaveLength(0);
  });
});

import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { storybookConfigDetector } from "../../../../src/analyzers/string-reference/detectors/storybook-config.js";
import { ConsoleLogger } from "../../../../src/utils/logger.js";

const FIXTURE_DIR = path.join(
  import.meta.dirname,
  "../../../fixtures/string-references/storybook-config"
);
const FIXTURE = path.join(FIXTURE_DIR, ".storybook/main.ts");

const ctx = {
  projectPath: FIXTURE_DIR,
  installedPackages: new Set([
    "@storybook/addon-mcp",
    "@storybook/addon-essentials",
    "@storybook/nextjs",
  ]),
  logger: new ConsoleLogger({ verbose: false }),
};

describe("storybookConfigDetector", () => {
  it("detects @storybook/addon-mcp from addons array", async () => {
    const refs = await storybookConfigDetector.detect(FIXTURE, ctx);
    expect(refs.map((r) => r.packageName)).toContain("@storybook/addon-mcp");
  });

  it("detects @storybook/addon-essentials from addons array", async () => {
    const refs = await storybookConfigDetector.detect(FIXTURE, ctx);
    expect(refs.map((r) => r.packageName)).toContain("@storybook/addon-essentials");
  });

  it("detects @storybook/nextjs from framework.name", async () => {
    const refs = await storybookConfigDetector.detect(FIXTURE, ctx);
    expect(refs.map((r) => r.packageName)).toContain("@storybook/nextjs");
  });

  it("does not emit refs for packages not in installedPackages", async () => {
    const emptyCtx = { ...ctx, installedPackages: new Set<string>() };
    const refs = await storybookConfigDetector.detect(FIXTURE, emptyCtx);
    expect(refs).toHaveLength(0);
  });
});

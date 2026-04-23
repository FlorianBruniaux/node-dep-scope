import { describe, it, expect, vi } from "vitest";
import * as path from "node:path";
import { UsageAnalyzer } from "../../../src/analyzers/usage-analyzer.js";

const FIXTURE = path.join(
  import.meta.dirname,
  "../../fixtures/regressions/florent-5-cases"
);

// Mock only peer dep analysis (no node_modules in fixture)
const mockPeerDepAnalyzer = {
  analyzePeerDeps: vi.fn().mockResolvedValue(new Map()),
};

describe("regression: Florent 5 false-REMOVE cases", () => {
  it("none of the 5 packages get REMOVE verdict", async () => {
    const analyzer = new UsageAnalyzer(
      {
        srcPaths: ["./src"],
        includeDev: true,
        withKnip: false,
      },
      { peerDepAnalyzer: mockPeerDepAnalyzer as never }
    );

    const results = await analyzer.scanProject(FIXTURE);
    const byName = new Map(results.map((r) => [r.name, r.verdict]));

    const falsePositives = [
      "oxfmt",
      "oxlint",
      "@storybook/addon-mcp",
      "@svgr/webpack",
      "jsdom",
    ];

    for (const pkg of falsePositives) {
      const verdict = byName.get(pkg);
      expect(
        verdict,
        `Expected ${pkg} not to be REMOVE (got: ${verdict ?? "not found"})`
      ).not.toBe("REMOVE");
    }
  });
});

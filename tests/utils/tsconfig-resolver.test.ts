import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  resolveTsConfig,
  parseEsTarget,
  targetSupports,
} from "../../src/utils/tsconfig-resolver.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let tmpDir: string;

function writeTsConfig(dir: string, content: object, filename = "tsconfig.json"): string {
  const p = path.join(dir, filename);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(content, null, 2));
  return p;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dep-scope-tsconfig-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveTsConfig
// ─────────────────────────────────────────────────────────────────────────────

describe("resolveTsConfig", () => {
  it("returns TS defaults when tsconfig.json is absent", () => {
    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES3");
    expect(result.module).toBe("COMMONJS");
  });

  it("reads target and module from simple tsconfig.json", () => {
    writeTsConfig(tmpDir, {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
      },
    });

    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES2022");
    expect(result.module).toBe("NODENEXT");
    expect(result.moduleResolution).toBe("NODENEXT");
  });

  it("normalizes target and module to uppercase", () => {
    writeTsConfig(tmpDir, {
      compilerOptions: { target: "es2019", module: "commonjs" },
    });

    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES2019");
    expect(result.module).toBe("COMMONJS");
  });

  it("follows local relative extends", () => {
    // Base tsconfig with target ES2018
    writeTsConfig(tmpDir, { compilerOptions: { target: "ES2018" } }, "tsconfig.base.json");

    // Child tsconfig extends the base and overrides module only
    writeTsConfig(tmpDir, {
      extends: "./tsconfig.base.json",
      compilerOptions: { module: "NodeNext" },
    });

    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES2018"); // from base
    expect(result.module).toBe("NODENEXT"); // from child
  });

  it("child compilerOptions override extends", () => {
    writeTsConfig(tmpDir, { compilerOptions: { target: "ES5" } }, "tsconfig.base.json");

    writeTsConfig(tmpDir, {
      extends: "./tsconfig.base.json",
      compilerOptions: { target: "ES2022" },
    });

    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES2022"); // child wins
  });

  it("follows extends chain of depth 2", () => {
    writeTsConfig(tmpDir, { compilerOptions: { target: "ES2015" } }, "tsconfig.root.json");
    writeTsConfig(tmpDir, {
      extends: "./tsconfig.root.json",
      compilerOptions: { module: "ESNext" },
    }, "tsconfig.mid.json");
    writeTsConfig(tmpDir, {
      extends: "./tsconfig.mid.json",
    });

    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES2015");
    expect(result.module).toBe("ESNEXT");
  });

  it("handles tsconfig with JSON comments gracefully", () => {
    const raw = `{
  // Single-line comment
  "compilerOptions": {
    "target": "ES2020" /* inline comment */
  }
}`;
    fs.writeFileSync(path.join(tmpDir, "tsconfig.json"), raw);

    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES2020");
  });

  it("returns defaults when tsconfig.json has invalid JSON", () => {
    fs.writeFileSync(path.join(tmpDir, "tsconfig.json"), "{ invalid json }");
    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES3");
  });

  it("does not follow cycles (self-referencing extends)", () => {
    writeTsConfig(tmpDir, {
      extends: "./tsconfig.json", // self-reference
      compilerOptions: { target: "ES2022" },
    });

    // Should not hang or throw
    const result = resolveTsConfig(tmpDir);
    expect(result.target).toBe("ES2022");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseEsTarget
// ─────────────────────────────────────────────────────────────────────────────

describe("parseEsTarget", () => {
  it("parses ES year targets", () => {
    expect(parseEsTarget("ES2022")).toBe(2022);
    expect(parseEsTarget("ES2019")).toBe(2019);
    expect(parseEsTarget("ES2015")).toBe(2015);
    expect(parseEsTarget("ES5")).toBe(5);
    expect(parseEsTarget("ES3")).toBe(3);
  });

  it("parses ESNEXT as very high value", () => {
    expect(parseEsTarget("ESNEXT")).toBe(9999);
  });

  it("returns 0 for unknown strings", () => {
    expect(parseEsTarget("INVALID")).toBe(0);
    expect(parseEsTarget("")).toBe(0);
  });

  it("is case-insensitive", () => {
    expect(parseEsTarget("es2022")).toBe(2022);
    expect(parseEsTarget("esnext")).toBe(9999);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// targetSupports
// ─────────────────────────────────────────────────────────────────────────────

describe("targetSupports", () => {
  it("returns true when project target is equal to required", () => {
    expect(targetSupports("ES2022", "ES2022")).toBe(true);
  });

  it("returns true when project target is higher than required", () => {
    expect(targetSupports("ES2022", "ES2020")).toBe(true);
    expect(targetSupports("ESNEXT", "ES2024")).toBe(true);
  });

  it("returns false when project target is lower than required", () => {
    expect(targetSupports("ES2019", "ES2022")).toBe(false);
    expect(targetSupports("ES5", "ES2015")).toBe(false);
  });

  it("handles structuredClone scenario (ES2022)", () => {
    // structuredClone requires ES2022
    expect(targetSupports("ES2022", "ES2022")).toBe(true);
    expect(targetSupports("ES2019", "ES2022")).toBe(false);
  });
});

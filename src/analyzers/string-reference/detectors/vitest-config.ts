import type {
  IStringReferenceDetector,
  StringReference,
  DetectorContext,
} from "../../../types/string-ref.js";
import { extractStringLiterals } from "../utils/config-ast-walker.js";

const FILE_PATTERNS = [
  "vitest.config.ts",
  "vitest.config.js",
  "vitest.config.mjs",
  "vitest.config.cjs",
];

export const vitestConfigDetector: IStringReferenceDetector = {
  id: "vitest-config",
  label: "vitest.config.*",
  filePatterns: FILE_PATTERNS,

  async detect(filePath: string, ctx: DetectorContext): Promise<StringReference[]> {
    const literals = await extractStringLiterals(filePath);
    const results: StringReference[] = [];

    for (const { value, line, column } of literals) {
      if (!ctx.installedPackages.has(value)) continue;

      results.push({
        packageName: value,
        kind: "config-env",
        detector: "vitest-config",
        location: { file: filePath, line, column },
        rawValue: value,
        evidence: `vitest config string literal: "${value}"`,
      });
    }

    return results;
  },
};

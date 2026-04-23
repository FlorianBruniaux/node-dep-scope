import type {
  IStringReferenceDetector,
  StringReference,
  DetectorContext,
} from "../../../types/string-ref.js";
import { extractStringLiterals } from "../utils/config-ast-walker.js";

const FILE_PATTERNS = [
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "next.config.cjs",
];

export const nextConfigDetector: IStringReferenceDetector = {
  id: "next-config",
  label: "next.config.*",
  filePatterns: FILE_PATTERNS,

  async detect(filePath: string, ctx: DetectorContext): Promise<StringReference[]> {
    const literals = await extractStringLiterals(filePath);
    const results: StringReference[] = [];

    for (const { value, line, column } of literals) {
      if (!ctx.installedPackages.has(value)) continue;

      results.push({
        packageName: value,
        kind: "config-loader",
        detector: "next-config",
        location: { file: filePath, line, column },
        rawValue: value,
        evidence: `next.config string literal: "${value}"`,
      });
    }

    return results;
  },
};

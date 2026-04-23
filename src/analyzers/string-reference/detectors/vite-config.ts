import type {
  IStringReferenceDetector,
  StringReference,
  DetectorContext,
} from "../../../types/string-ref.js";
import { extractStringLiterals } from "../utils/config-ast-walker.js";

const FILE_PATTERNS = [
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.cjs",
];

export const viteConfigDetector: IStringReferenceDetector = {
  id: "vite-config",
  label: "vite.config.*",
  filePatterns: FILE_PATTERNS,

  async detect(filePath: string, ctx: DetectorContext): Promise<StringReference[]> {
    const literals = await extractStringLiterals(filePath);
    const results: StringReference[] = [];

    for (const { value, line, column } of literals) {
      if (!ctx.installedPackages.has(value)) continue;

      results.push({
        packageName: value,
        kind: "config-plugin",
        detector: "vite-config",
        location: { file: filePath, line, column },
        rawValue: value,
        evidence: `vite config string literal: "${value}"`,
      });
    }

    return results;
  },
};

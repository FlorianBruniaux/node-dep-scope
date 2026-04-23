import type {
  IStringReferenceDetector,
  StringReference,
  DetectorContext,
} from "../../../types/string-ref.js";
import { extractStringLiterals } from "../utils/config-ast-walker.js";

// Read by absolute path — the .storybook ignore in SourceFileScanner does not apply here
const FILE_PATTERNS = [
  ".storybook/main.ts",
  ".storybook/main.js",
  ".storybook/main.mjs",
  ".storybook/main.cjs",
];

export const storybookConfigDetector: IStringReferenceDetector = {
  id: "storybook-config",
  label: ".storybook/main.*",
  filePatterns: FILE_PATTERNS,

  async detect(filePath: string, ctx: DetectorContext): Promise<StringReference[]> {
    const literals = await extractStringLiterals(filePath);
    const results: StringReference[] = [];

    for (const { value, line, column } of literals) {
      if (!ctx.installedPackages.has(value)) continue;

      results.push({
        packageName: value,
        kind: "config-plugin",
        detector: "storybook-config",
        location: { file: filePath, line, column },
        rawValue: value,
        evidence: `.storybook/main string literal: "${value}"`,
      });
    }

    return results;
  },
};

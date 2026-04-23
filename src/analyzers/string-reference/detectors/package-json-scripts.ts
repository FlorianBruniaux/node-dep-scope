import * as fs from "node:fs/promises";
import type {
  IStringReferenceDetector,
  StringReference,
  DetectorContext,
} from "../../../types/string-ref.js";
import { extractBinariesFromScript } from "../utils/script-tokenizer.js";

export const packageJsonScriptsDetector: IStringReferenceDetector = {
  id: "package-json-scripts",
  label: "package.json scripts",
  filePatterns: ["package.json"],

  async detect(filePath: string, ctx: DetectorContext): Promise<StringReference[]> {
    const raw = await fs.readFile(filePath, "utf-8");
    const pkg = JSON.parse(raw) as Record<string, unknown>;

    const scripts = pkg["scripts"];
    if (!scripts || typeof scripts !== "object") return [];

    const results: StringReference[] = [];
    const entries = Object.entries(scripts as Record<string, string>);

    for (const [scriptName, scriptValue] of entries) {
      if (typeof scriptValue !== "string") continue;

      const binaries = extractBinariesFromScript(scriptValue);
      for (const binary of binaries) {
        if (!ctx.installedPackages.has(binary)) continue;

        results.push({
          packageName: binary,
          kind: "script-binary",
          detector: "package-json-scripts",
          location: { file: filePath, line: 1, column: 0 },
          rawValue: binary,
          evidence: `scripts.${scriptName}: "${scriptValue}"`,
        });
      }
    }

    return results;
  },
};

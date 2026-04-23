import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { ImportInfo, ILogger } from "../../types/index.js";
import type { IStringReferenceAnalyzer } from "../../types/string-ref.js";
import { DetectorRegistry } from "./registry.js";
import { toSyntheticImport } from "./synthetic-import.js";

export class StringReferenceAnalyzer implements IStringReferenceAnalyzer {
  constructor(
    private readonly registry: DetectorRegistry,
    private readonly logger: ILogger
  ) {}

  async collect(
    projectPath: string,
    installedPackages: Set<string>
  ): Promise<ImportInfo[]> {
    const detectors = this.registry.list();

    if (detectors.length === 0) return [];

    const ctx = { projectPath, installedPackages, logger: this.logger };
    const results: ImportInfo[] = [];

    await Promise.all(
      detectors.map(async (detector) => {
        for (const pattern of detector.filePatterns) {
          const filePath = path.join(projectPath, pattern);
          try {
            await fs.access(filePath);
          } catch {
            continue;
          }

          try {
            const refs = await detector.detect(filePath, ctx);
            for (const ref of refs) {
              results.push(toSyntheticImport(ref));
            }
            if (refs.length > 0) {
              this.logger.debug(
                `[string-ref] ${detector.id}: ${refs.length} ref(s) in ${pattern}`
              );
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.debug(`[string-ref] ${detector.id} error on ${pattern}: ${msg}`);
          }
        }
      })
    );

    return results;
  }
}

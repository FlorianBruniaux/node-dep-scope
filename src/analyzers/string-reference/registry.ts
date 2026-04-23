import type { IStringReferenceDetector } from "../../types/string-ref.js";
import { BUILTINS } from "./detectors/index.js";

export class DetectorRegistry {
  private detectors = new Map<string, IStringReferenceDetector>();
  private disabled = new Set<string>();

  register(d: IStringReferenceDetector): void {
    this.detectors.set(d.id, d);
  }

  unregister(id: string): void {
    this.detectors.delete(id);
  }

  disable(ids: string[] | "all"): void {
    if (ids === "all") {
      this.disabled = new Set(this.detectors.keys());
    } else {
      for (const id of ids) this.disabled.add(id);
    }
  }

  list(): IStringReferenceDetector[] {
    return [...this.detectors.values()].filter((d) => !this.disabled.has(d.id));
  }

  static withBuiltins(disabledIds?: string[]): DetectorRegistry {
    const registry = new DetectorRegistry();
    for (const d of BUILTINS) registry.register(d);
    if (disabledIds && disabledIds.length > 0) registry.disable(disabledIds);
    return registry;
  }
}

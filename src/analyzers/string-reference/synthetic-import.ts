import type { ImportInfo } from "../../types/index.js";
import type { StringReference } from "../../types/string-ref.js";

export function toSyntheticImport(ref: StringReference): ImportInfo {
  return {
    packageName: ref.packageName,
    importPath: ref.packageName,
    symbol: "__string_ref__",
    importType: "side-effect",
    location: ref.location,
  };
}

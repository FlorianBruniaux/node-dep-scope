import type { IStringReferenceDetector } from "../../../types/string-ref.js";
import { packageJsonScriptsDetector } from "./package-json-scripts.js";
import { vitestConfigDetector } from "./vitest-config.js";
import { viteConfigDetector } from "./vite-config.js";
import { nextConfigDetector } from "./next-config.js";
import { storybookConfigDetector } from "./storybook-config.js";

export const BUILTINS: IStringReferenceDetector[] = [
  packageJsonScriptsDetector,
  vitestConfigDetector,
  viteConfigDetector,
  nextConfigDetector,
  storybookConfigDetector,
];

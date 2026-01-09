/**
 * Duplicate Categories Database
 * Defines functional overlaps between libraries
 */

import type { DependencyAnalysis, DuplicateGroup, LibraryUsage } from "../types/index.js";

interface CategoryDefinition {
  description: string;
  packages: string[];
  recommendation: string;
  preferredOrder: string[]; // First = most recommended
}

const DUPLICATE_CATEGORIES: Record<string, CategoryDefinition> = {
  icons: {
    description: "Icon libraries",
    packages: [
      "lucide-react",
      "@tabler/icons-react",
      "react-icons",
      "@radix-ui/react-icons",
      "@heroicons/react",
      "phosphor-react",
      "@primer/octicons-react",
      "@fortawesome/react-fontawesome",
    ],
    recommendation: "Consolidate to a single icon library for consistency and smaller bundle",
    preferredOrder: ["lucide-react", "@heroicons/react", "@tabler/icons-react"],
  },

  date: {
    description: "Date manipulation libraries",
    packages: [
      "date-fns",
      "dayjs",
      "moment",
      "luxon",
      "@internationalized/date",
      "fecha",
      "date-fns-tz",
    ],
    recommendation: "date-fns preferred for tree-shaking; dayjs for smallest footprint; avoid moment (deprecated)",
    preferredOrder: ["date-fns", "dayjs", "luxon"],
  },

  cssUtils: {
    description: "CSS class utilities",
    packages: [
      "classnames",
      "clsx",
      "tailwind-merge",
      "cva",
      "class-variance-authority",
    ],
    recommendation: "clsx is smallest; use tailwind-merge with Tailwind CSS",
    preferredOrder: ["clsx", "tailwind-merge", "classnames"],
  },

  http: {
    description: "HTTP client libraries",
    packages: [
      "axios",
      "ky",
      "got",
      "node-fetch",
      "isomorphic-fetch",
      "cross-fetch",
      "unfetch",
      "redaxios",
    ],
    recommendation: "Native fetch() unless specific features needed (interceptors, retries)",
    preferredOrder: [], // Prefer native
  },

  state: {
    description: "State management",
    packages: [
      "zustand",
      "jotai",
      "recoil",
      "valtio",
      "mobx",
      "mobx-react",
      "@reduxjs/toolkit",
      "redux",
      "react-redux",
      "xstate",
    ],
    recommendation: "Choose one based on complexity needs; zustand/jotai for simple, Redux for complex",
    preferredOrder: ["zustand", "jotai", "@reduxjs/toolkit"],
  },

  dnd: {
    description: "Drag and drop",
    packages: [
      "react-dnd",
      "react-dnd-html5-backend",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/utilities",
      "react-beautiful-dnd",
      "@hello-pangea/dnd",
      "react-sortable-hoc",
    ],
    recommendation: "@dnd-kit preferred (modern, accessible, maintained); react-beautiful-dnd deprecated",
    preferredOrder: ["@dnd-kit/core", "@hello-pangea/dnd", "react-dnd"],
  },

  validation: {
    description: "Schema validation",
    packages: [
      "zod",
      "yup",
      "joi",
      "ajv",
      "superstruct",
      "valibot",
      "io-ts",
      "class-validator",
    ],
    recommendation: "zod for TypeScript; valibot for smallest bundle; yup if simpler API preferred",
    preferredOrder: ["zod", "valibot", "yup"],
  },

  forms: {
    description: "Form libraries",
    packages: [
      "react-hook-form",
      "formik",
      "final-form",
      "react-final-form",
      "@tanstack/react-form",
    ],
    recommendation: "react-hook-form for performance; @tanstack/react-form is newer alternative",
    preferredOrder: ["react-hook-form", "@tanstack/react-form", "formik"],
  },

  animation: {
    description: "Animation libraries",
    packages: [
      "framer-motion",
      "react-spring",
      "@react-spring/web",
      "motion",
      "gsap",
      "animejs",
      "popmotion",
    ],
    recommendation: "framer-motion for complex; CSS transitions for simple; react-spring as lighter alternative",
    preferredOrder: ["framer-motion", "@react-spring/web"],
  },

  markdown: {
    description: "Markdown parsing/rendering",
    packages: [
      "react-markdown",
      "marked",
      "markdown-it",
      "remark",
      "unified",
      "mdx",
      "@mdx-js/react",
    ],
    recommendation: "react-markdown for React; marked for simple HTML output",
    preferredOrder: ["react-markdown", "marked"],
  },

  uuid: {
    description: "UUID generation",
    packages: [
      "uuid",
      "nanoid",
      "cuid",
      "ulid",
      "short-uuid",
    ],
    recommendation: "crypto.randomUUID() native; nanoid if shorter IDs needed",
    preferredOrder: [], // Prefer native
  },

  lodashLike: {
    description: "Utility libraries",
    packages: [
      "lodash",
      "lodash-es",
      "underscore",
      "ramda",
      "remeda",
      "radash",
    ],
    recommendation: "Prefer native ES6+; lodash-es if needed (tree-shakable); avoid underscore",
    preferredOrder: ["lodash-es", "remeda", "radash"],
  },
};

/**
 * Detect duplicate libraries in a list of dependency analyses
 */
export const detectDuplicates = (
  analyses: DependencyAnalysis[]
): DuplicateGroup[] => {
  const duplicates: DuplicateGroup[] = [];
  const analyzedPackages = new Set(analyses.map((a) => a.name));

  for (const [category, definition] of Object.entries(DUPLICATE_CATEGORIES)) {
    // Find which packages from this category are installed
    const installedInCategory = definition.packages.filter((pkg) =>
      analyzedPackages.has(pkg)
    );

    // Only report if more than one library from category is installed
    if (installedInCategory.length > 1) {
      const libraries: LibraryUsage[] = installedInCategory.map((pkg) => {
        const analysis = analyses.find((a) => a.name === pkg)!;
        const isPreferred = definition.preferredOrder[0] === pkg;
        const isInPreferred = definition.preferredOrder.includes(pkg);

        return {
          name: pkg,
          fileCount: analysis.fileCount,
          symbolCount: analysis.totalSymbolsUsed,
          recommendation: isPreferred
            ? "keep"
            : analysis.fileCount === 0
              ? "remove"
              : "migrate",
        };
      });

      // Sort by file count (most used first)
      libraries.sort((a, b) => b.fileCount - a.fileCount);

      // Determine which to keep (most used or preferred)
      const mostUsed = libraries[0];
      const preferred = libraries.find((l) =>
        definition.preferredOrder.includes(l.name)
      );
      const toKeep = preferred ?? mostUsed;

      // Update recommendations
      for (const lib of libraries) {
        if (lib.name === toKeep.name) {
          lib.recommendation = "keep";
        } else if (lib.fileCount === 0) {
          lib.recommendation = "remove";
        } else {
          lib.recommendation = "migrate";
        }
      }

      duplicates.push({
        category,
        description: definition.description,
        libraries,
        recommendation: {
          keep: toKeep.name,
          migrate: libraries
            .filter((l) => l.recommendation === "migrate")
            .map((l) => l.name),
          remove: libraries
            .filter((l) => l.recommendation === "remove")
            .map((l) => l.name),
        },
        potentialSavings: {
          bundleKb: estimateSavings(libraries.filter((l) => l.recommendation !== "keep")),
          dependencyCount: libraries.filter((l) => l.recommendation !== "keep").length,
        },
      });
    }
  }

  return duplicates;
};

/**
 * Estimate bundle savings from removing libraries
 */
const estimateSavings = (libraries: LibraryUsage[]): number => {
  // Rough estimates in KB (gzipped)
  const sizeEstimates: Record<string, number> = {
    "lucide-react": 10,
    "@tabler/icons-react": 15,
    "react-icons": 12,
    "@radix-ui/react-icons": 8,
    "date-fns": 15,
    dayjs: 3,
    moment: 70,
    classnames: 2,
    clsx: 1,
    axios: 14,
    "react-dnd": 12,
    "@dnd-kit/core": 8,
    "framer-motion": 50,
    "react-spring": 20,
    lodash: 72,
    "lodash-es": 72,
  };

  return libraries.reduce((total, lib) => {
    return total + (sizeEstimates[lib.name] ?? 5);
  }, 0);
};

/**
 * Get category for a package
 */
export const getCategoryForPackage = (
  packageName: string
): string | undefined => {
  for (const [category, definition] of Object.entries(DUPLICATE_CATEGORIES)) {
    if (definition.packages.includes(packageName)) {
      return category;
    }
  }
  return undefined;
};

/**
 * Get all packages in a category
 */
export const getCategoryPackages = (category: string): string[] => {
  return DUPLICATE_CATEGORIES[category]?.packages ?? [];
};

/**
 * Check if a package has duplicates among installed packages
 * Returns the category name if duplicates exist, undefined otherwise
 */
export const hasDuplicatesInstalled = (
  packageName: string,
  installedPackages: string[]
): string | undefined => {
  const category = getCategoryForPackage(packageName);
  if (!category) return undefined;

  const categoryPackages = getCategoryPackages(category);
  const otherInstalled = categoryPackages.filter(
    (pkg) => pkg !== packageName && installedPackages.includes(pkg)
  );

  return otherInstalled.length > 0 ? category : undefined;
};

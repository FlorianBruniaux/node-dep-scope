/**
 * React preset - optimized for React/Next.js projects
 */

import type { DepScopeConfig } from "../schema.js";

export const reactPreset: Partial<DepScopeConfig> = {
  wellKnownPatterns: [
    // React core - used via JSX, not direct imports
    { pattern: "react", verdict: "KEEP", reason: "React framework - used via JSX" },
    { pattern: "react-dom", verdict: "KEEP", reason: "React DOM renderer" },
    { pattern: "react-dom/*", verdict: "KEEP", reason: "React DOM submodules" },

    // React types
    { pattern: "@types/react", verdict: "IGNORE", reason: "React type definitions" },
    { pattern: "@types/react-dom", verdict: "IGNORE", reason: "React DOM types" },

    // Next.js specific
    { pattern: "next/*", verdict: "KEEP", reason: "Next.js submodules" },
    { pattern: "@next/*", verdict: "KEEP", reason: "Next.js ecosystem" },

    // Common React libraries
    { pattern: "react-router", verdict: "KEEP", reason: "React Router" },
    { pattern: "react-router-dom", verdict: "KEEP", reason: "React Router DOM" },
    { pattern: "@remix-run/*", verdict: "KEEP", reason: "Remix framework" },
    { pattern: "framer-motion", verdict: "KEEP", reason: "Animation library" },
    { pattern: "@react-spring/*", verdict: "KEEP", reason: "Animation library" },

    // Styling solutions
    { pattern: "styled-components", verdict: "KEEP", reason: "CSS-in-JS" },
    { pattern: "@emotion/*", verdict: "KEEP", reason: "CSS-in-JS" },
    { pattern: "tailwindcss", verdict: "IGNORE", reason: "CSS framework - config only" },
    { pattern: "autoprefixer", verdict: "IGNORE", reason: "PostCSS plugin" },
    { pattern: "postcss", verdict: "IGNORE", reason: "CSS processor" },
  ],
};

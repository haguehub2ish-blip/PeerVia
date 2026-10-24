import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // Apostrophes in page text are fine in React, and this site doesn't use the React Compiler.
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      // Plain <a> links to your own pages work, they just reload the page instead of switching instantly.
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
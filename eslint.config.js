// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: [
      "src/app/**/*.tsx",
      "src/components/**/*.{ts,tsx}",
      "src/hooks/**/*.{ts,tsx}",
      "src/screens/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/services/api/*-client"],
              message:
                "Use a typed hook from @/services/query/ for remote client calls.",
            },
          ],
        },
      ],
    },
  },
]);

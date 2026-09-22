import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Staff routes are deliberately not localized: src/middleware.ts sends /admin
    // through Supabase auth instead of next-intl, and the admin tree has its own
    // root layout with no provider. A next-intl Link or hook there throws
    // "No intl context found" at render — and only for a signed-in user, because
    // anonymous requests are redirected before the page renders.
    files: ["src/app/admin/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/i18n/navigation",
              message: "Админка не локализована — используйте next/link и next/navigation.",
            },
            {
              name: "next-intl",
              message: "Админка не локализована — next-intl здесь не работает.",
            },
            {
              name: "next-intl/server",
              message: "Админка не локализована — next-intl здесь не работает.",
            },
          ],
        },
      ],
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

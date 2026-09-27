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
  {
    // A focused <input>/<textarea> below 16px makes iOS/Android auto-zoom the
    // page on focus (see the SeatPicker mobile-menu-misalignment incident) —
    // the visitor never sees the same layout twice. Public routes only: admin
    // is staff-only and was never the complaint.
    files: ["src/app/\\[locale\\]/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name=/^(input|textarea)$/] JSXAttribute[name.name='className'] Literal[value=/\\btext-(xs|sm)\\b/]",
          message:
            "Меньше text-base на публичной форме триггерит автозум при фокусе на мобильных — используйте text-base или крупнее.",
        },
        {
          selector:
            "JSXOpeningElement[name.name=/^(input|textarea)$/] JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\btext-(xs|sm)\\b/]",
          message:
            "Меньше text-base на публичной форме триггерит автозум при фокусе на мобильных — используйте text-base или крупнее.",
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

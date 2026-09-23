import { defineRailway, github, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
  const culturePortalKz = service("culture-portal-kz", {
    source: github("anuar-rgb/zhylyoi-sazy", { branch: "master", checkSuites: false }),
    // Next is started directly, never through npm. npm does not forward SIGTERM
    // quietly: it exits non-zero on shutdown, Railway reads that as a crash, and
    // mails "Deploy Crashed" after every deploy although nothing crashed. This
    // line is what railway.json used to carry; read the Railway section of
    // AGENTS.md before touching it.
    start: "node node_modules/next/dist/bin/next start",
    replicas: { "us-west2": 1 },
    networking: { privateNetworkEndpoint: "zhylyoi-sazy" },
    env: { DATA_DIR: preserve(), NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: preserve(), NEXT_PUBLIC_SUPABASE_URL: preserve(), TELEGRAM_BOT_TOKEN: preserve(), TELEGRAM_CHAT_ID: preserve() },
  });

  return project("culture-portal-kz", {
    resources: [culturePortalKz],
  });
});

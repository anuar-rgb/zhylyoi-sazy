import type { PipelineDeps } from "./pipeline";
import { getProvider } from "./registry";
import { createSupabaseStore } from "./store";

/** The pipeline as the site runs it. Throws when the server key is not configured. */
export function livePipeline(): PipelineDeps {
  return { store: createSupabaseStore(), getProvider };
}

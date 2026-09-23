import { createClient } from "@/lib/supabase/server";

/**
 * What the settings page is allowed to know about the institution's bot.
 *
 * The token itself is deliberately absent. It is a secret the institution pastes
 * in once; sending it back to the browser on every page load would put it in the
 * page source, in the browser cache and in any screen recording of the settings
 * page, for no gain — nobody needs to read it, only to replace it.
 */
export type TelegramSettings = {
  hasToken: boolean;
  chatId: string;
  isEnabled: boolean;
};

export const EMPTY_TELEGRAM: TelegramSettings = { hasToken: false, chatId: "", isEnabled: true };

/**
 * Reads the bot settings of one institution.
 *
 * RLS is the boundary: only somebody who manages this institution gets a row, and
 * anon has no privilege on the table at all — measured, not assumed, a direct read
 * as anon comes back as 42501.
 */
export async function getTelegramSettings(organizationId: string): Promise<TelegramSettings> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("org_telegram")
    .select("bot_token, chat_id, is_enabled")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return EMPTY_TELEGRAM;

  return {
    // Reduced to a yes/no here, at the edge of the server, so the token has no path
    // into anything the browser receives.
    hasToken: typeof data.bot_token === "string" && data.bot_token.length > 0,
    chatId: data.chat_id ?? "",
    isEnabled: data.is_enabled ?? true,
  };
}

/**
 * Stores the bot settings, reporting whether the row was really written.
 *
 * A null token means "leave the stored one alone": the form cannot show the current
 * token, so an empty field has to mean "unchanged" rather than "erase". Clearing is
 * a separate, deliberate action.
 *
 * Judged by the row count, because RLS filters rows instead of refusing the
 * statement — without this, a write nobody was allowed to make would look like
 * success.
 */
export async function saveTelegramSettings(
  organizationId: string,
  input: { botToken: string | null; chatId: string | null; isEnabled: boolean }
): Promise<boolean> {
  const supabase = await createClient();

  const row: Record<string, unknown> = {
    organization_id: organizationId,
    chat_id: input.chatId,
    is_enabled: input.isEnabled,
    updated_at: new Date().toISOString(),
  };
  if (input.botToken !== null) row.bot_token = input.botToken;

  const { error, count } = await supabase
    .from("org_telegram")
    .upsert(row, { onConflict: "organization_id", count: "exact" });

  return !error && count === 1;
}

/** Forgets the token while keeping the rest of the row, so the chat id survives. */
export async function clearTelegramToken(organizationId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error, count } = await supabase
    .from("org_telegram")
    .update({ bot_token: null, updated_at: new Date().toISOString() }, { count: "exact" })
    .eq("organization_id", organizationId);

  return !error && count === 1;
}

export type TelegramTestResult = "sent" | "not_configured" | "denied" | "failed";

/**
 * Asks the database to send a test message.
 *
 * The send lives in Postgres because the token does. This only triggers it and
 * repeats the verdict, so the token never travels through the application.
 */
export async function sendTelegramTest(organizationId: string): Promise<TelegramTestResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("org_telegram_send_test", { org: organizationId });

  if (error) return "failed";
  return data === "sent" || data === "not_configured" || data === "denied" ? data : "failed";
}

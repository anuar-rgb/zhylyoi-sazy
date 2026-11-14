"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INPUT =
  "w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 disabled:opacity-60";
const MIN_LENGTH = 8;

/**
 * Opens the one-time link from the email (verifyOtp with its token), then lets the person choose a
 * password. The link works once: a second visit, or one after a day, says so and asks for a new one.
 */
/** institution: the full name of the site's institution, from its card. */
export default function SetPasswordForm({ institution }: { institution: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const started = useRef(false);
  const tokenHash = params.get("token_hash");
  const [state, setState] = useState<"checking" | "ready" | "invalid">(tokenHash ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (started.current || !tokenHash) return;
    started.current = true;
    createClient()
      .auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })
      .then(({ error: verifyError }) => setState(verifyError ? "invalid" : "ready"))
      .catch(() => setState("invalid"));
  }, [tokenHash]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (password.length < MIN_LENGTH) return setError(`Пароль должен быть не короче ${MIN_LENGTH} знаков.`);
    if (password !== repeat) return setError("Пароли не совпадают.");
    setSaving(true);
    setError(null);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError(updateError.message.toLowerCase().includes("weak") ? "Слишком простой пароль, придумайте другой." : "Не удалось сохранить пароль.");
      return;
    }
    // The staff area sends a controller on to the door by itself.
    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-cream-dark">
          <h1 className="text-xl font-bold text-ocean mb-1">Новый пароль</h1>
          <p className="text-sm text-ocean/60 mb-6">{institution}</p>

          {state === "checking" && <p className="text-sm text-ocean/60">Проверяем ссылку…</p>}

          {state === "invalid" && (
            <p className="text-sm text-ocean/70">
              Ссылка уже использована или устарела. Попросите администратора Дома культуры отправить новую.
            </p>
          )}

          {state === "ready" && (
            <form onSubmit={save}>
              <div className="mb-4">
                <label htmlFor="new_password" className="block text-sm font-medium text-ocean/70 mb-1">
                  Пароль (не короче {MIN_LENGTH} знаков)
                </label>
                <input
                  id="new_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={saving}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div className="mb-4">
                <label htmlFor="repeat_password" className="block text-sm font-medium text-ocean/70 mb-1">
                  Повторите пароль
                </label>
                <input
                  id="repeat_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  disabled={saving}
                  value={repeat}
                  onChange={(e) => setRepeat(e.target.value)}
                  className={INPUT}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-600 mb-4">
                  {error}
                </p>
              )}
              <button type="submit" disabled={saving} className="btn-primary w-full py-3 font-semibold disabled:opacity-60">
                {saving ? "Сохранение…" : "Сохранить и войти"}
              </button>
            </form>
          )}
        </div>
        <div className="text-center mt-5">
          <Link href="/login" className="text-sm font-semibold text-ocean/60 hover:text-ocean transition-colors">
            Вход для сотрудников
          </Link>
        </div>
      </div>
    </div>
  );
}

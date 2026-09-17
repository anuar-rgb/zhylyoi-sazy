"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** Maps Supabase auth errors onto messages a non-technical user can act on. */
function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Проверьте email и пароль.";
  if (m.includes("email not confirmed")) return "Email не подтверждён. Обратитесь к администратору.";
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Слишком много попыток. Попробуйте через несколько минут.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) return "Сервис временно недоступен.";
  return "Не удалось выполнить вход.";
}

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(friendlyError(signInError.message));
        setLoading(false);
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Сервис временно недоступен.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-cream-dark">
          <h1 className="text-xl font-bold text-ocean mb-1">Вход для сотрудников</h1>
          <p className="text-sm text-ocean/60 mb-6">«Кең Жылыой» мәдениет үйі</p>

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-ocean/70 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 disabled:opacity-60"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-ocean/70 mb-1">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 disabled:opacity-60"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 mb-4">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 font-semibold disabled:opacity-60">
            {loading ? "Вход…" : "Войти"}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link href="/" className="text-sm font-semibold text-ocean/60 hover:text-ocean transition-colors">
            ← Вернуться на сайт
          </Link>
        </div>
      </div>
    </div>
  );
}

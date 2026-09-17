"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "./actions";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    const result = await login(password);
    if (result.ok) {
      router.refresh();
    } else {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm border border-cream-dark w-full max-w-sm">
        <h1 className="text-xl font-bold text-ocean mb-6">Админ-панель</h1>
        <label htmlFor="admin-password" className="block text-sm font-medium text-ocean/70 mb-1">
          Пароль
        </label>
        <input
          id="admin-password"
          type="password"
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-5 py-3 border border-cream-dark rounded-full focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent bg-cream/30 mb-4"
        />
        {error && <p className="text-sm text-red-600 mb-4">Неверный пароль.</p>}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-3 font-semibold disabled:opacity-60"
        >
          Войти
        </button>
      </form>
    </div>
  );
}

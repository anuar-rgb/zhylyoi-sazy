"use client";

import { useRouter } from "next/navigation";
import { logout } from "./actions";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="text-sm font-semibold text-ocean/60 hover:text-ocean transition-colors"
    >
      Выйти
    </button>
  );
}

"use client";

import { signOut } from "next-auth/react";

export function AdminLogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition"
    >
      Выйти
    </button>
  );
}
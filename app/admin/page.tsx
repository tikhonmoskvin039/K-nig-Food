"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "../components/AdminLogoutButton";

export default function AdminPage() {
  const { data: session } = useSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="p-10 min-h-[calc(100vh-var(--header-height))] flex items-center bg-white">
      <h1 className="text-3xl font-bold">Панель администратора</h1>

      <AdminLogoutButton />
    </div>
  );
}
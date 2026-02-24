"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function AdminPage() {
  const { data: session } = useSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold">Панель администратора</h1>
    </div>
  );
}
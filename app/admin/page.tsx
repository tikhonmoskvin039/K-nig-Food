"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { AdminLogoutButton } from "../components/admin/AdminLogoutButton";
import ProductAdminPanel from "../components/admin/ProductAdminPanel";

export default function AdminPage() {
  const { data: session } = useSession();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="pt-(--header-height)">
      <div className="p-4 md:p-8 min-h-[calc(100vh-var(--header-height))] bg-white flex flex-col gap-6">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-gray-100 p-4 rounded-xl">
          <h1 className="text-2xl md:text-3xl font-bold text-center sm:text-left w-full sm:w-auto">
            Панель администратора
          </h1>

          <div className="flex justify-center sm:justify-end w-full sm:w-auto">
            <AdminLogoutButton />
          </div>
        </div>

        {/* Content */}
        <div className="w-full overflow-x-auto">
          <ProductAdminPanel />
        </div>
      </div>
    </div>
  );
}

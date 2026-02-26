"use client";

import Link from "next/link";
import { AdminLogoutButton } from "./AdminLogoutButton";

type Props = {
  title: string;
  children: React.ReactNode;
  showLogout?: boolean;
  actionHref?: string;
  actionLabel?: string;
  actionClassName?: string;
};

export default function AdminPageFrame({
  title,
  children,
  showLogout = true,
  actionHref,
  actionLabel,
  actionClassName,
}: Props) {
  return (
    <div className="pt-(--header-height)">
      <div className="p-4 md:p-8 min-h-[calc(100vh-var(--header-height))] bg-white flex flex-col gap-6">
        <div className="flex flex-col gap-4 bg-gray-100 p-4 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-center sm:text-left">
              {title}
            </h1>

            <div className="flex justify-center sm:justify-end">
              {actionHref && actionLabel ? (
                <Link
                  href={actionHref}
                  className={
                    actionClassName ||
                    "inline-flex items-center justify-center px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
                  }
                >
                  {actionLabel}
                </Link>
              ) : showLogout ? (
                <AdminLogoutButton />
              ) : null}
            </div>
          </div>
        </div>

        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}

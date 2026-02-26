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
      <div className="p-4 md:p-6 min-h-[calc(100vh-var(--header-height))] flex flex-col gap-5">
        <div className="surface-card-soft p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-center sm:text-left text-slate-900">
              {title}
            </h1>

            <div className="flex justify-center sm:justify-end">
              {actionHref && actionLabel ? (
                <Link
                  href={actionHref}
                  className={
                    actionClassName ||
                    "btn-primary"
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

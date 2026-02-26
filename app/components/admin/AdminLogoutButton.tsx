"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import ConfirmModal from "../common/ConfirmModal";

export function AdminLogoutButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);

      await signOut({
        callbackUrl: "/admin/login",
      });
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setConfirmOpen(true)}
        className="btn-danger px-6"
      >
        Выйти
      </button>

      <ConfirmModal
        open={confirmOpen}
        title="Выход из системы"
        description="Вы уверены, что хотите выйти? Все несохранённые данные будут потеряны."
        confirmText={loading ? "Выход..." : "Выйти"}
        cancelText="Отмена"
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

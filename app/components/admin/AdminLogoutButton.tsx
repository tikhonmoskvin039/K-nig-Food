"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmModal from "../common/ConfirmModal";
import ButtonSpinner from "../common/ButtonSpinner";
import { CiLogout } from "react-icons/ci";


export function AdminLogoutButton() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);

      await fetch("/api/admin/session", {
        method: "DELETE",
      });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <button onClick={() => setConfirmOpen(true)} className="btn-danger px-6">
        <CiLogout size={24} />
      </button>

      <ConfirmModal
        open={confirmOpen}
        title="Выход из системы"
        description="Вы уверены, что хотите выйти? Все несохранённые данные будут потеряны."
        confirmText={loading ? <ButtonSpinner /> : "Выйти"}
        cancelText="Отмена"
        onConfirm={handleLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

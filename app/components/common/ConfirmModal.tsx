"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface IConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;

  confirmText?: string;
  cancelText?: string;

  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  description,

  confirmText = "Подтвердить",
  cancelText = "Отмена",

  onConfirm,
  onCancel,
}: IConfirmModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="surface-card w-full max-w-md overflow-hidden"
          >
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {title}
              </h3>

              {description && (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6 pt-2 flex-wrap">
              <button
                onClick={onCancel}
                className="btn-secondary"
              >
                {cancelText}
              </button>

              <button
                onClick={onConfirm}
                className="btn-danger"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

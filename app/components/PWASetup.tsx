"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  flushOfflineQueue,
  installOfflineFetchQueue,
  type OfflineQueueFlushedDetail,
  type OfflineQueueQueuedDetail,
} from "../lib/offlineRequestQueue";

const QUEUED_TOAST_COOLDOWN_MS = 4_000;
const QUEUED_TOAST_ID = "offline-queue-queued";
const FLUSHED_TOAST_ID = "offline-queue-flushed";

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    const syncManager = (
      registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
      }
    ).sync;

    if (syncManager) {
      try {
        await syncManager.register("kfood-offline-sync");
      } catch {
        // Background Sync may be unavailable or blocked by browser settings.
      }
    }
  } catch (error) {
    console.error("Failed to register service worker:", error);
  }
}

export default function PWASetup() {
  const lastQueuedToastAtRef = useRef(0);

  useEffect(() => {
    let idleFlushHandle = 0;

    installOfflineFetchQueue();
    const scheduleInitialFlush = () => {
      if (!navigator.onLine) return;
      void flushOfflineQueue();
    };

    if (typeof window.requestIdleCallback === "function") {
      idleFlushHandle = window.requestIdleCallback(() => {
        scheduleInitialFlush();
      }, { timeout: 1200 }) as unknown as number;
    } else {
      idleFlushHandle = window.setTimeout(scheduleInitialFlush, 400);
    }

    if (document.readyState === "complete") {
      void registerServiceWorker();
    } else {
      window.addEventListener("load", () => {
        void registerServiceWorker();
      }, { once: true });
    }

    const handleOnline = () => {
      toast.success("Сеть восстановлена. Отправляем накопленные запросы.");
      void flushOfflineQueue();
    };

    const handleOffline = () => {
      toast.warning(
        "Вы офлайн. Действия с отправкой данных будут поставлены в очередь.",
      );
    };

    const handleQueued = (event: Event) => {
      const { detail } = event as CustomEvent<OfflineQueueQueuedDetail>;
      const now = Date.now();

      if (now - lastQueuedToastAtRef.current < QUEUED_TOAST_COOLDOWN_MS) {
        return;
      }

      lastQueuedToastAtRef.current = now;
      toast.info("Запрос добавлен в офлайн-очередь.", {
        id: QUEUED_TOAST_ID,
        description: `Метод: ${detail.method}. В очереди: ${detail.queueSize}.`,
      });
    };

    const handleFlushed = (event: Event) => {
      const { detail } = event as CustomEvent<OfflineQueueFlushedDetail>;
      if (detail.sent > 0) {
        toast.success("Офлайн-очередь обработана.", {
          id: FLUSHED_TOAST_ID,
          description: `Успешно отправлено: ${detail.sent}.`,
        });
      }

      if (detail.failed > 0 && detail.remaining > 0) {
        toast.warning("Часть запросов пока не отправлена.", {
          description: `Ошибок: ${detail.failed}. Осталось в очереди: ${detail.remaining}.`,
        });
      }
    };

    const handleServiceWorkerMessage = (
      event: MessageEvent<{
        type?: string;
        payload?: { sent?: number; failed?: number };
      }>,
    ) => {
      if (event.data?.type === "OFFLINE_SYNC_RESULT") {
        const sent = Number(event.data.payload?.sent || 0);
        const failed = Number(event.data.payload?.failed || 0);

        if (sent > 0) {
          toast.success("Фоновая синхронизация завершена.", {
            description: `Успешно отправлено: ${sent}.`,
          });
        }

        if (failed > 0) {
          toast.warning("Часть фоновых запросов не отправилась.", {
            description: `Ошибок: ${failed}.`,
          });
        }
        return;
      }

      if (event.data?.type === "OFFLINE_SYNC") {
        void flushOfflineQueue();
      }
    };

    const intervalId = window.setInterval(() => {
      if (navigator.onLine) {
        void flushOfflineQueue();
      }
    }, 45_000);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue:queued", handleQueued);
    window.addEventListener("offline-queue:flushed", handleFlushed);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "message",
        handleServiceWorkerMessage,
      );
    }

    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleFlushHandle as unknown as number);
      } else {
        window.clearTimeout(idleFlushHandle);
      }
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue:queued", handleQueued);
      window.removeEventListener("offline-queue:flushed", handleFlushed);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleServiceWorkerMessage,
        );
      }
    };
  }, []);

  return null;
}

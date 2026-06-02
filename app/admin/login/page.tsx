"use client";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ButtonSpinner from "../../components/common/ButtonSpinner";

type AdminAuthResponse = {
  authenticated?: boolean;
  message?: string;
};

async function requestAdminSession(username: string, password: string) {
  const response = await fetch("/api/admin/auth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });
  const data = (await response.json().catch(() => null)) as
    | AdminAuthResponse
    | null;

  if (!response.ok || !data?.authenticated) {
    throw new Error(data?.message || "Не удалось выполнить вход.");
  }
}

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const credentialsMissing = !username.trim() || !password;
  const submitDisabled = loading || checkingSession || credentialsMissing;

  useEffect(() => {
    let isCancelled = false;

    const checkSession = async () => {
      try {
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
        });
        const data = (await response.json()) as { authenticated?: boolean };

        if (!isCancelled && data.authenticated) {
          router.replace("/admin");
        }
      } catch {
        // Login form remains available when the session probe fails.
      } finally {
        if (!isCancelled) {
          setCheckingSession(false);
        }
      }
    };

    void checkSession();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (credentialsMissing) {
      toast.error("Введите логин и пароль.");
      return;
    }

    try {
      setLoading(true);

      await requestAdminSession(username.trim(), password);

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось выполнить вход.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-[calc(100vh-var(--header-height))] flex items-center justify-center py-16 px-4">
      <div className="surface-card max-w-md w-full p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900 leading-tight">
            Авторизация
          </h1>
          <p className="text-slate-600 text-base">
            Вход в административную панель
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
          <label className="block text-left">
            <span className="block text-sm font-semibold text-slate-700 mb-2">
              Логин
            </span>
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200">
              <User size={18} className="text-slate-500" aria-hidden="true" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full bg-transparent outline-none text-slate-900"
                autoComplete="off"
                disabled={loading || checkingSession}
              />
            </span>
          </label>

          <label className="block text-left">
            <span className="block text-sm font-semibold text-slate-700 mb-2">
              Пароль
            </span>
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-200">
              <Lock size={18} className="text-slate-500" aria-hidden="true" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent outline-none text-slate-900"
                autoComplete="current-password"
                disabled={loading || checkingSession}
              />
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                onClick={() => setShowPassword((value) => !value)}
                disabled={loading || checkingSession}
                aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                title={showPassword ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary inline-flex min-h-[52px] w-full items-center justify-center gap-2 text-lg px-8 py-3"
            disabled={submitDisabled}
            aria-busy={loading}
          >
            <span
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              {loading ? <ButtonSpinner /> : <LogIn size={20} />}
            </span>
            <span>Войти</span>
          </button>
        </form>
      </div>
    </section>
  );
}

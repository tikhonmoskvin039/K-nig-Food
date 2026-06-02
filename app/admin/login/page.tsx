"use client";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff, Lock, LogIn, User } from "lucide-react";
import { useRouter } from "next/navigation";
import ButtonSpinner from "../../components/common/ButtonSpinner";

type AdminLoginSocketResponse =
  | {
      type: "admin.login.ok";
      loginToken: string;
    }
  | {
      type: "admin.login.error";
      message?: string;
    };

function buildAdminAuthSocketUrl(host: string) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";

  return `${protocol}//${host}/api/admin/auth/ws`;
}

function getAdminAuthSocketUrls() {
  const { hostname, host, port } = window.location;
  const fallbackHost = port ? `127.0.0.1:${port}` : "127.0.0.1";
  const hosts =
    hostname === "0.0.0.0" || hostname === "::" || hostname === "[::]"
      ? [fallbackHost, host]
      : [host];

  if (hostname === "localhost") {
    hosts.push(fallbackHost);
  }

  if (hostname === "127.0.0.1") {
    hosts.push(port ? `localhost:${port}` : "localhost");
  }

  return Array.from(new Set(hosts)).map(buildAdminAuthSocketUrl);
}

function requestLoginTokenFromSocketUrl(
  socketUrl: string,
  username: string,
  password: string,
) {
  return new Promise<string>((resolve, reject) => {
    const socket = new WebSocket(socketUrl);
    let settled = false;

    const timeoutId = window.setTimeout(() => {
      settleWithError(new Error("Сервер авторизации не отвечает."));
    }, 3500);

    const settleWithToken = (loginToken: string) => {
      if (settled) return;

      settled = true;
      window.clearTimeout(timeoutId);
      socket.close(1000);
      resolve(loginToken);
    };

    const settleWithError = (error: Error) => {
      if (settled) return;

      settled = true;
      window.clearTimeout(timeoutId);
      socket.close();
      reject(error);
    };

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "admin.login",
          username,
          password,
        }),
      );
    });

    socket.addEventListener("message", (event) => {
      let payload: AdminLoginSocketResponse;

      try {
        payload = JSON.parse(String(event.data));
      } catch {
        settleWithError(new Error("Некорректный ответ сервера авторизации."));
        return;
      }

      if (payload.type === "admin.login.ok" && payload.loginToken) {
        settleWithToken(payload.loginToken);
        return;
      }

      if (payload.type === "admin.login.error") {
        settleWithError(
          new Error(payload.message || "Не удалось выполнить вход."),
        );
        return;
      }

      settleWithError(new Error("Не удалось выполнить вход."));
    });

    socket.addEventListener("error", () => {
      settleWithError(new Error("WebSocket авторизации недоступен."));
    });

    socket.addEventListener("close", (event) => {
      if (!settled && event.code !== 1000) {
        settleWithError(new Error("Соединение авторизации закрыто."));
      }
    });
  });
}

async function requestLoginToken(username: string, password: string) {
  let lastError: Error | null = null;

  for (const socketUrl of getAdminAuthSocketUrls()) {
    try {
      return await requestLoginTokenFromSocketUrl(socketUrl, username, password);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Не удалось выполнить вход.");
    }
  }

  throw lastError || new Error("Сервер авторизации не отвечает.");
}

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

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

    if (!username.trim() || !password) {
      setError("Введите логин и пароль.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const loginToken = await requestLoginToken(username.trim(), password);
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ loginToken }),
      });
      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.message || "Не удалось открыть сессию.");
      }

      router.replace("/admin");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Не удалось выполнить вход.");
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

        <form className="space-y-4" onSubmit={handleSubmit}>
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
                autoComplete="username"
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

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="btn-primary inline-flex w-full items-center justify-center gap-2 text-lg px-8 py-3"
            disabled={loading || checkingSession}
          >
            {loading ? (
              <ButtonSpinner />
            ) : (
              <>
                <LogIn size={20} aria-hidden="true" />
                Войти
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

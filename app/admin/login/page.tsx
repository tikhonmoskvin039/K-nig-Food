"use client";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLogin() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.replace("/admin");
    }
  }, [session, router]);

  return (
    <section className="min-h-[calc(100vh-var(--header-height))] flex items-center justify-center py-16 px-4 text-center">
      <div className="surface-card max-w-xl w-full p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 text-slate-900 leading-tight">
            Авторизация
          </h1>
        </div>

        <p className="text-slate-600 text-base md:text-lg">
          Вход в административную панель через oAuth. Только для сотрудников.
        </p>

        <button
          onClick={() => signIn("github", { callbackUrl: "/admin" })}
          className="btn-primary text-lg md:text-xl px-8 py-3 w-full sm:w-auto"
        >
          Войти
        </button>
      </div>
    </section>
  );
}

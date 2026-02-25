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
    <section className="min-h-[calc(100vh-var(--header-height))] flex items-center justify-center bg-white py-16 px-6 text-center">
      <div className="max-w-xl w-full space-y-8">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 text-gray-900 leading-tight">
            Авторизация
          </h1>
        </div>

        <p className="text-gray-600 text-base md:text-lg">
          Вход в административную панель через oAuth. Только для сотрудников.
        </p>

        <button
          onClick={() => signIn("github", { callbackUrl: "/admin" })}
          className="
            bg-white text-gray-600
            hover:bg-gray-200 hover:text-gray-800
            px-8 py-4 rounded-full
            text-lg md:text-xl font-bold
            shadow-lg transition-transform
            hover:scale-105 md:hover:scale-110
            w-full sm:w-auto
          "
        >
          Войти
        </button>
      </div>
    </section>
  );
}

import Link from "next/link";

export default function OfflinePage() {
  return (
    <section className="section-wrap min-h-[calc(100vh-var(--header-height))]">
      <div className="app-shell max-w-2xl">
        <div className="surface-card p-6 md:p-8 text-center space-y-4">
          <h1 className="page-title">Вы сейчас офлайн</h1>
          <p className="text-sm md:text-base text-[color:var(--color-muted)]">
            Проверьте подключение к сети и попробуйте обновить страницу. Если вы
            отправляли форму или изменение, запрос будет отправлен автоматически
            после восстановления сети.
          </p>
          <div>
            <Link href="/" className="btn-primary">
              На главную
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

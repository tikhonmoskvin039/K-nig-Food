"use client";

import { useState, FormEvent } from "react";
import { useLocalization } from "@/app/context/LocalizationContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ButtonSpinner from "./common/ButtonSpinner";
import { isOfflineQueuedResponse } from "../lib/offlineRequestQueue";

export default function ContactUsForm() {
  const { contactForm } = useLocalization();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const infoTitle =
    contactForm.infoTitle || "По каким вопросам можно написать";
  const infoDescription =
    contactForm.infoDescription ||
    "Мы отвечаем на обращения вручную и помогаем с заказами, меню и организационными вопросами.";
  const reasons = Array.isArray(contactForm.reasons) && contactForm.reasons.length > 0
    ? contactForm.reasons
    : [
        "Уточнить состав блюд, аллергены и рекомендации по хранению.",
        "Обсудить индивидуальный заказ под мероприятие или корпоратив.",
        "Получить помощь по заказу, оплате, доставке и работе сайта.",
      ];

  const validate = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      toast.error("Все поля должны быть заполнены");
      return false;
    }

    if (trimmedName.length < 2) {
      toast.error("Имя слишком короткое");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Введите корректный email");
      return false;
    }

    if (trimmedMessage.length < 10) {
      toast.error("Сообщение должно содержать минимум 10 символов");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);

      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      if (!res.ok) throw new Error();
      if (isOfflineQueuedResponse(res)) {
        toast.info("Сообщение поставлено в очередь.", {
          description: "Оно будет отправлено автоматически при восстановлении сети.",
          duration: 3500,
        });
        setName("");
        setEmail("");
        setMessage("");
        return;
      }

      toast.success(contactForm.successMessage, { duration: 2000 });

      setName("");
      setEmail("");
      setMessage("");

      // 🔥 редирект через 2 секунды (чтобы пользователь увидел toast)
      setTimeout(() => {
        router.push("/");
      }, 2000);

    } catch {
      toast.error(contactForm.errorMessage, { duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-wrap w-full min-h-[calc(100vh-var(--header-height))]">
      <div className="app-shell max-w-3xl">
        <h2 className="page-title text-center">
          {contactForm.subtitle}
        </h2>

        <div className="surface-card-soft p-5 md:p-6 mt-4">
          <h3 className="text-xl font-semibold">{infoTitle}</h3>
          <p className="text-sm text-slate-600 mt-2">{infoDescription}</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-700 list-disc pl-5">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>

        <form
          onSubmit={handleSubmit}
          className="surface-card p-6 md:p-8 space-y-5 mt-4"
        >
          <input
            type="text"
            className="form-control"
            placeholder={contactForm.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="email"
            className="form-control"
            placeholder={contactForm.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <textarea
            rows={6}
            className="form-control min-h-36"
            placeholder={contactForm.messagePlaceholder}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary min-h-11 min-w-44"
          >
            {isSubmitting ? <ButtonSpinner /> : contactForm.buttonText}
          </button>
        </form>
      </div>
    </section>
  );
}

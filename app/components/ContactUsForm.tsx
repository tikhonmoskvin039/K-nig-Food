"use client";

import { useState, FormEvent } from "react";
import { useLocalization } from "@/app/context/LocalizationContext";
import { toast } from "sonner";

export default function ContactUsForm() {
  const { contactForm } = useLocalization();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) throw new Error();

      setName("");
      setEmail("");
      setMessage("");

      toast.success(contactForm.successMessage, { duration: 3000 });
    } catch (error) {
      toast.error(contactForm.errorMessage, { duration: 3000 });
    }
  };

  return (
    <>
      <section className="w-full min-h-screen bg-stone-100 py-16">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-black text-center">
            {contactForm.subtitle}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="bg-white shadow-md rounded-lg p-8 space-y-6 mt-3"
          >
            {/* Name */}
            <input
              className="w-full border p-3 rounded"
              placeholder={contactForm.namePlaceholder}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {/* Email */}
            <input
              type="email"
              className="w-full border p-3 rounded"
              placeholder={contactForm.emailPlaceholder}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Message */}
            <textarea
              rows={6}
              className="w-full border p-3 rounded"
              placeholder={contactForm.messagePlaceholder}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              type="submit"
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md font-semibold transition"
            >
              {contactForm.buttonText}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}

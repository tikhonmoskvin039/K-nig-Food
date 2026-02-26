"use client";

import { useLocalization } from "../../context/LocalizationContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setBillingForm } from "../../store/slices/checkoutSlice";
import { useState } from "react";

export default function BillingForm() {
  const { labels } = useLocalization();
  const dispatch = useAppDispatch();
  const billingForm = useAppSelector((state) => state.checkout.billingForm);
  const [emailError, setEmailError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    dispatch(setBillingForm({ [name]: value }));

    // Validate email on change
    if (name === "email") {
      validateEmail(value);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Поле Email должно быть заполнено");
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError("");
    }
  };

  const handleEmailBlur = () => {
    validateEmail(billingForm.email);
  };

  return (
    <div className="surface-card p-5 md:p-6 space-y-4">
      <h3 className="section-title text-xl md:text-2xl">
        {labels.billingInformation || "Платежная информация"}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            {labels.firstName || "Имя"}
          </span>
          <input
            name="firstName"
            value={billingForm.firstName}
            onChange={handleChange}
            placeholder={labels.firstName || "Имя"}
            className="form-control"
            required
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            {labels.lastName || "Фамилия"}
          </span>
          <input
            name="lastName"
            value={billingForm.lastName}
            onChange={handleChange}
            placeholder={labels.lastName || "Фамилия"}
            className="form-control"
            required
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="space-y-1 block">
          <span className="text-xs uppercase tracking-wide text-slate-500 font-semibold">
            {labels.email || "Email"}
          </span>
          <input
            name="email"
            type="email"
            value={billingForm.email}
            onChange={handleChange}
            onBlur={handleEmailBlur}
            placeholder={labels.email || "Введите email"}
            className={`form-control ${emailError ? "border-red-500" : ""}`}
            required
          />
        </label>
        {emailError && <p className="text-red-500 text-sm">{emailError}</p>}
        <p className="text-sm text-slate-600 mt-2">
          {labels.downloadLinkEmailNotice ||
            "Подробности заказа будут отправлены на этот адрес электронной почты после подтверждения оплаты."}
        </p>
      </div>
    </div>
  );
}

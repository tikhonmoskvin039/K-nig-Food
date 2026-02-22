import nodemailer from 'nodemailer';
import { getLocalization } from "./getLocalization";

// ----- Gmail SMTP Transporter -----

function createGmailTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use TLS
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

// ----- Send Email -----

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  try {
    console.log('📧 Attempting to send email...');
    console.log('📧 From:', process.env.GMAIL_USER);
    console.log('📧 To:', to);
    console.log('📧 Subject:', subject);

    const transporter = createGmailTransporter();

    const result = await transporter.sendMail({
      from: `"${getLocalization().siteName || 'König Food'}" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
    });

    console.log('✅ Email sent successfully:', {
      messageId: result.messageId,
      response: result.response,
    });
  } catch (error) {
    console.error("❌ Failed to send email to:", to, "\nError:", error);
    throw error; // Re-throw to let caller know it failed
  }
}

// ----- Format Order Summary -----

export function formatOrderSummary(cartItems: DTMinimalCartItem[] | DTOrderCartItem[]): {
  lines: string;
  subtotal: number;
} {
  const lines = cartItems
    .map(
      (item) =>
        `- ${item.Title} × ${item.quantity} = $${(
          parseFloat(item.SalePrice || item.RegularPrice) * item.quantity
        ).toFixed(2)}`
    )
    .join("\n");

  const subtotal = cartItems.reduce(
    (acc, item) =>
      acc + item.quantity * parseFloat(item.SalePrice || item.RegularPrice),
    0
  );

  return { lines, subtotal };
}

// ----- Admin Email -----

export function generateAdminEmail(
  body: DTOrderBody,
  summary: string,
  total: number
): string {
  // Generate download links section

  return `Новый заказ получен

Номер заказа: ${body.orderId}
Дата заказа: ${body.orderDate}
Клиент: ${body.billingForm.firstName} ${body.billingForm.lastName}
Email: ${body.billingForm.email}

Метод оплаты: ${body.paymentMethodId.toUpperCase()}

Состав заказа:
${summary}

Всего: ${total.toFixed(2)}

Дата: ${new Date().toLocaleString()}
`;
}

// ----- Customer Email -----

export function generateCustomerEmail(
  body: DTOrderBody,
  summary: string,
  total: number
): string {
  const { labels, siteName } = getLocalization();

  return `Hi ${body.billingForm.firstName},

${labels.orderConfirmationMessage || "Ваш заказ был успешно размещён. Спасибо за вашу покупку!"}

Номер заказа: ${body.orderId}
Дата заказа: ${body.orderDate}
Метод оплаты: ${body.paymentMethodId.toUpperCase()}

Состав заказа:
${summary}

Всего: ${total.toFixed(2)} ₽

Спасибо за то что вы с нами!
${siteName || "König Food"}
`;
}

// ----- Send Admin Email -----

export async function sendAdminEmail(body: DTOrderBody) {
  const { lines, subtotal } = formatOrderSummary(body.cartItems);
  const total = subtotal;

  const text = generateAdminEmail(body, lines, total);
  const subject = `🛒 Новый заказ от ${body.billingForm.firstName} ${body.billingForm.lastName}`;

  await sendEmail({
    to: process.env.GMAIL_USER!,
    subject,
    text,
  });
}

// ----- Send Customer Email -----

export async function sendCustomerEmail(body: DTOrderBody) {
  const { lines, subtotal } = formatOrderSummary(body.cartItems);
  const total = subtotal;

  const text = generateCustomerEmail(body, lines, total);
  const subject =
    getLocalization().labels.orderConfirmationTitle || "Подтверждение вашего заказа";

  await sendEmail({
    to: body.billingForm.email,
    subject,
    text,
  });
}

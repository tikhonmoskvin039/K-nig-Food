import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import {
  beginIdempotentRequest,
  buildIdempotencyConflictResponse,
  buildIdempotencyReplayResponse,
  hashJsonPayload,
  storeIdempotentResponse,
} from "../../lib/idempotency";

export async function POST(req: Request) {
  const endpoint = "/api/contact";

  try {
    const { name, email, message } = await req.json();
    const payloadForHash = {
      name: String(name || "").trim(),
      email: String(email || "").trim().toLowerCase(),
      message: String(message || "").trim(),
    };

    const requestHash = hashJsonPayload(payloadForHash);
    const idempotency = await beginIdempotentRequest({
      headers: req.headers,
      endpoint,
      requestHash,
    });

    if (idempotency.type === "conflict") {
      return buildIdempotencyConflictResponse();
    }

    if (idempotency.type === "replay") {
      return buildIdempotencyReplayResponse({
        statusCode: idempotency.statusCode,
        responseBody: idempotency.responseBody,
      });
    }

    if (!name || !email || !message) {
      const responseBody = {
        success: false,
        message: "Пропущены обязательные поля.",
      };
      const statusCode = 400;
      await storeIdempotentResponse({
        key: idempotency.key,
        endpoint,
        requestHash,
        statusCode,
        responseBody,
      });

      return NextResponse.json(
        responseBody,
        { status: statusCode },
      );
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"König Food" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `Контактная форма от ${name}`,
      html: `
        <p><strong>Имя:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Сообщение:</strong><br/>
        ${message.replace(/\n/g, "<br/>")}
        </p>
      `,
    });

    const responseBody = { success: true };
    const statusCode = 200;
    await storeIdempotentResponse({
      key: idempotency.key,
      endpoint,
      requestHash,
      statusCode,
      responseBody,
    });

    return NextResponse.json(responseBody, { status: statusCode });
  } catch (error) {
    console.error("SMTP email error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

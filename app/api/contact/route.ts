import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Пропущены обязательные поля." },
        { status: 400 },
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SMTP email error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

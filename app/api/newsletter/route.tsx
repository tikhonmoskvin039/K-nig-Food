import { NextResponse } from "next/server";
import {
  beginIdempotentRequest,
  buildIdempotencyConflictResponse,
  buildIdempotencyReplayResponse,
  hashJsonPayload,
  storeIdempotentResponse,
} from "../../lib/idempotency";

export async function POST(req: Request) {
  const endpoint = "/api/newsletter";

  try {
    const { email } = await req.json();
    const payloadForHash = {
      email: String(email || "").trim().toLowerCase(),
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

    if (!email) {
      const responseBody = { error: "Поле Email должно быть заполнено" };
      const statusCode = 400;
      await storeIdempotentResponse({
        key: idempotency.key,
        endpoint,
        requestHash,
        statusCode,
        responseBody,
      });
      return NextResponse.json(responseBody, { status: statusCode });
    }

    // Access env vars inside the function to prevent build-time inlining
    const MAILCHIMP_API_KEY = process.env.MAILCHIMP_API_KEY;
    const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
    const MAILCHIMP_SERVER_PREFIX = process.env.MAILCHIMP_SERVER_PREFIX;

    const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `apikey ${MAILCHIMP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
      }),
    });

    if (!response.ok) {
      const responseBody = { error: "Subscription failed" };
      const statusCode = 400;
      await storeIdempotentResponse({
        key: idempotency.key,
        endpoint,
        requestHash,
        statusCode,
        responseBody,
      });
      return NextResponse.json(responseBody, { status: statusCode });
    }

    const responseBody = { message: "Subscribed successfully" };
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
    console.error("Mailchimp API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

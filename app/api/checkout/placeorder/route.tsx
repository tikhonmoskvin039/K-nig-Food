import { NextRequest, NextResponse } from "next/server";
import {
  sendAdminEmail,
  sendCustomerEmail,
} from "../../../utils/emailUtilities";
import getProducts from "../../../utils/getProducts";
import { getCheckoutSettings } from "../../../utils/getCheckout";
import {
  beginIdempotentRequest,
  buildIdempotencyConflictResponse,
  buildIdempotencyReplayResponse,
  hashJsonPayload,
  storeIdempotentResponse,
} from "../../../lib/idempotency";

export async function POST(req: NextRequest) {
  const endpoint = "/api/checkout/placeorder";

  try {
    const body = (await req.json()) as DTOrderBody;
    const requestHash = hashJsonPayload(body);
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

    // 1. Basic validation
    if (!body.orderId) {
      console.error("❌ Validation failed: Missing orderId");
      const responseBody = { error: "Missing order ID." };
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
    if (!body.orderDate) {
      console.error("❌ Validation failed: Missing orderDate");
      const responseBody = { error: "Missing order date." };
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
    if (!body.cartItems?.length) {
      console.error("❌ Validation failed: No cart items");
      const responseBody = { error: "Cart is empty." };
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
    if (!body.billingForm?.email) {
      console.error("❌ Validation failed: Missing billing email");
      const responseBody = { error: "Missing billing email." };
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
    if (!body.paymentMethodId) {
      console.error("❌ Validation failed: Missing payment method");
      const responseBody = { error: "Missing payment method." };
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

    // 2. Load settings and validate payment method
    const settings = getCheckoutSettings();
    const paymentMethodValid = settings.paymentMethods.some(
      (pm) => pm.id === body.paymentMethodId && pm.enabled,
    );

    if (!paymentMethodValid) {
      console.error(
        "❌ Validation failed: Invalid payment method:",
        body.paymentMethodId,
      );
      const responseBody = { error: "Invalid payment method." };
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

    // 3. Validate product prices and IDs
    const allProducts = await getProducts();
    for (const item of body.cartItems) {
      const found = allProducts.find((p) => p.ID === item.ID);
      if (!found) {
        console.error("❌ Validation failed: Product not found:", item.ID);
        const responseBody = { error: `Product not found: ${item.ID}` };
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
      const expectedPrice = parseFloat(found.SalePrice || found.RegularPrice);
      const submittedPrice = parseFloat(item.SalePrice || item.RegularPrice);
      if (expectedPrice !== submittedPrice) {
        console.error(
          `❌ Validation failed: Price mismatch for ${item.ID}. Expected: ${expectedPrice}, Got: ${submittedPrice}`,
        );
        const responseBody = { error: `Invalid price for product: ${item.Title}` };
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
    }

    // 4. Enrich cart items with additional fields before sending emails
    const enrichedCartItems = body.cartItems.map((item) => {
      return {
        ...item,
      };
    });

    // Update body with enriched cart items
    const enrichedBody = {
      ...body,
      cartItems: enrichedCartItems,
    };

    // Send emails with priority: customer first, then admin after delay (rate limit)
    console.log(
      `📧 Sending order confirmation emails for order ${body.orderId}...`,
    );
    console.log(`📧 Customer email: ${body.billingForm.email}`);
    console.log(`📧 Admin email: ${process.env.GMAIL_USER}`);

    let customerEmailSent = false;
    let adminEmailSent = false;

    // 1. Send customer email first (priority - they need download links)
    try {
      await sendCustomerEmail(enrichedBody);
      console.log("✅ Customer email sent successfully");
      customerEmailSent = true;
    } catch (err) {
      console.error("❌ Failed to send customer email:", err);
    }

    // 2. Wait 2 seconds to respect Gmail SMTP rate limit
    console.log(
      "⏳ Waiting 2 seconds before sending admin email (rate limit)...",
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 3. Send admin email
    try {
      await sendAdminEmail(enrichedBody);
      console.log("✅ Admin email sent successfully");
      adminEmailSent = true;
    } catch (err) {
      console.error("❌ Failed to send admin email:", err);
    }

    if (!adminEmailSent || !customerEmailSent) {
      console.error(
        "⚠️ Some emails failed to send. Admin:",
        adminEmailSent,
        "Customer:",
        customerEmailSent,
      );
    }

    // Return success with enriched cart items (including download URLs)
    // Frontend needs these to display download links on order confirmation page
    const responseBody = {
      message: "Order placed successfully",
      cartItems: enrichedCartItems,
    };
    const statusCode = 200;
    await storeIdempotentResponse({
      key: idempotency.key,
      endpoint,
      requestHash,
      statusCode,
      responseBody,
      ttlSeconds: 60 * 60 * 72,
    });

    return NextResponse.json(responseBody, { status: statusCode });
  } catch (error) {
    console.error("❌ Order placement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

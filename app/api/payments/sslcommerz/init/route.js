import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import ProductVariantModel from "@/models/ProductVariant.model "; // ✅ removed trailing space

export async function POST(req) {
  try {
    await connectDB();

    // ✅ Env from your .env.local
    const STORE_ID = process.env.NEXT_SSLCOMMERZ_STORE_ID;
    const STORE_PASS = process.env.NEXT_SSLCOMMERZ_STORE_PASS;
    const IS_LIVE = String(process.env.NEXT_SSLCOMMERZ_IS_LIVE || "false").toLowerCase() === "true";
    const BASE_URL = IS_LIVE ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";
    const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL;

    if (!STORE_ID || !STORE_PASS || !SITE_URL) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing env",
          missing: {
            NEXT_SSLCOMMERZ_STORE_ID: !STORE_ID,
            NEXT_SSLCOMMERZ_STORE_PASS: !STORE_PASS,
            NEXT_PUBLIC_BASE_URL: !SITE_URL,
          },
        },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { customer, products } = body || {};

    if (!Array.isArray(products) || !products.length) {
      return NextResponse.json({ success: false, message: "No products" }, { status: 400 });
    }

    // ✅ Recalculate from DB (ANTI-HACK)
    const verified = await Promise.all(
      products.map(async (p) => {
        const variant = await ProductVariantModel.findById(p.variantId)
          .populate("product")
          .lean();

        if (!variant) return null;

        const qty = Math.max(Number(p.quantity || 1), 1);
        const price = Number(variant?.sellingPrice || 0);

        return {
          variantId: String(variant._id),
          productId: String(variant?.product?._id || ""),
          name: variant?.product?.name || "Product",
          price,
          qty,
          lineTotal: price * qty,
        };
      })
    );

    const clean = verified.filter(Boolean);
    if (!clean.length) {
      return NextResponse.json({ success: false, message: "Invalid cart" }, { status: 400 });
    }

    const subtotal = clean.reduce((s, i) => s + i.lineTotal, 0);

    // ✅ shipping
    const shippingMap = { dhaka: 60, chattogram: 100, sylhet: 120, other: 150 };
    const shipping = shippingMap[customer?.cityId] ?? 0;

    // ✅ member discount (optional)
    const memberDiscountRate = 0.1;
    const memberDiscount = subtotal > 0 ? subtotal * memberDiscountRate : 0;

    const total = Math.max(subtotal - memberDiscount + shipping, 0);

    const tran_id = `TXN_${Date.now()}`;

    // ✅ TODO: Save order pending in DB (tran_id, total, products, customer)

    const payload = new URLSearchParams({
      store_id: STORE_ID,
      store_passwd: STORE_PASS,
      total_amount: String(Math.round(total)),
      currency: "BDT",
      tran_id,

      success_url: `${SITE_URL}/api/payment/sslcommerz/success`,
      fail_url: `${SITE_URL}/api/payment/sslcommerz/fail`,
      cancel_url: `${SITE_URL}/api/payment/sslcommerz/cancel`,
      ipn_url: `${SITE_URL}/api/payment/sslcommerz/ipn`,

      cus_name: customer?.name || "Customer",
      cus_email: customer?.email || "customer@email.com",
      cus_add1: customer?.address || "Dhaka",
      cus_city: customer?.cityId || "dhaka",
      cus_postcode: "1200",
      cus_country: "Bangladesh",
      cus_phone: customer?.phone || "01700000000",

      shipping_method: "NO",
      product_name: "Order Payment",
      product_category: "Ecommerce",
      product_profile: "general",

      value_a: tran_id,
      value_b: customer?.cityId || "",
    });

    const res = await fetch(`${BASE_URL}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload.toString(),
      cache: "no-store",
    });

    // ✅ SSL can return HTML/text, so parse safely
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // not json
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "SSLCommerz API error",
          status: res.status,
          raw: text.slice(0, 700),
        },
        { status: 502 }
      );
    }

    if (!data?.GatewayPageURL) {
      return NextResponse.json(
        { success: false, message: "SSL init failed (no GatewayPageURL)", data, raw: text.slice(0, 700) },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      gatewayUrl: data.GatewayPageURL,
      tran_id,
      total: Math.round(total),
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

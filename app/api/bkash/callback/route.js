import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const paymentID = searchParams.get("paymentID") || "";
  const orderId = searchParams.get("orderId") || "";

  if (status === "success" && paymentID && orderId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/payment/bkash-success?orderId=${encodeURIComponent(orderId)}&paymentID=${encodeURIComponent(paymentID)}`,
      302
    );
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}/payment/bkash-failed?orderId=${encodeURIComponent(orderId)}&status=${encodeURIComponent(status || "unknown")}`,
    302
  );
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { invoicePath } from "@/lib/invoiceLink";
import POSOrder from "@/models/posorder.model";

// SMS gateway: BulkSMSBD (bulksmsbd.net). Set in .env.local:
//   SMS_API_KEY=...        SMS_SENDER_ID=...     (approved sender id / masking)
// Without them the POS falls back to opening the device's SMS app.
const SMS_URL = process.env.SMS_API_URL || "https://bulksmsbd.net/api/smsapi";

const toBdNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (/^01\d{9}$/.test(digits)) return `88${digits}`;
  if (/^8801\d{9}$/.test(digits)) return digits;
  return null;
};

// POST { orderId, phone? } -> texts the customer their invoice link
export async function POST(req) {
  try {
    const auth = await isAuthenticated();
    if (!auth.isAuth || !["admin", "manager", "cashier"].includes(auth.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
    }

    const { orderId, phone: phoneOverride } = await req.json();
    if (!mongoose.isValidObjectId(orderId)) {
      return NextResponse.json({ success: false, message: "Invalid invoice" }, { status: 400 });
    }

    await connectDB();
    const order = await POSOrder.findById(orderId).select("orderNumber total phone").lean();
    if (!order) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    const number = toBdNumber(phoneOverride || order.phone);
    if (!number) {
      return NextResponse.json(
        { success: false, message: "Customer phone must be 01XXXXXXXXX" },
        { status: 400 },
      );
    }

    const origin = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const link = `${origin}${invoicePath(order.orderNumber)}`;
    // plain English keeps it to one or two SMS parts (Bangla costs 2-3x)
    const message =
      `SB Telecom: Thank you for your purchase. Invoice ${order.orderNumber}, ` +
      `Total Tk ${Number(order.total || 0).toLocaleString("en-US")}. View: ${link}`;

    if (!process.env.SMS_API_KEY || !process.env.SMS_SENDER_ID) {
      // no gateway yet: the page opens the phone's SMS app with this text
      return NextResponse.json({ success: true, configured: false, number, message });
    }

    const url = new URL(SMS_URL);
    url.search = new URLSearchParams({
      api_key: process.env.SMS_API_KEY,
      type: "text",
      number,
      senderid: process.env.SMS_SENDER_ID,
      message,
    }).toString();

    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    // BulkSMSBD answers response_code 202 when the SMS is accepted
    if (Number(data.response_code) !== 202) {
      return NextResponse.json(
        { success: false, message: data.error_message || data.success_message || "SMS gateway rejected the message" },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, configured: true, message: `SMS sent to ${number}` });
  } catch (error) {
    console.error("INVOICE SMS ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not send SMS" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";
import { sslValidate, pickSSLPaymentIndex, isValidSSLStatus } from "../_ssl";

export async function POST(req) {
  try {
    await connectDB();

    const form = await req.formData();
    const orderId = form.get("value_a");
    const val_id = form.get("val_id");
    const tran_id = form.get("tran_id");
    const status = form.get("status"); // VALID / FAILED / CANCELLED etc.

    // Always reply 200 quickly
    if (!orderId) return NextResponse.json({ ok: true });

    const existing = await OrderModel.findById(orderId).lean();
    if (!existing) return NextResponse.json({ ok: true });
    if (existing.status === "Paid") return NextResponse.json({ ok: true });

    const payIdx = pickSSLPaymentIndex(existing, { tran_id });

    // If IPN says VALID, still validate by validation API
    if (status === "VALID" || status === "VALIDATED") {
      const validation = await sslValidate(val_id);
      const vStatus = validation?.status;

      if (isValidSSLStatus(vStatus)) {
        await OrderModel.findByIdAndUpdate(orderId, {
          status: "Paid",
          activePaymentIndex: payIdx,
          $set: {
            [`payments.${payIdx}.status`]: "SUCCESS",
            [`payments.${payIdx}.valId`]: val_id || "",
            [`payments.${payIdx}.paymentId`]: tran_id || existing?.payments?.[payIdx]?.paymentId || "",
            [`payments.${payIdx}.trxId`]: validation?.bank_tran_id || "",
            [`payments.${payIdx}.rawResponse`]: validation,
            [`payments.${payIdx}.paidAt`]: new Date(),
          },
        });

        // ✅ TODO: stock reduce / cart clear (only once; guard by previous status)
        return NextResponse.json({ ok: true });
      }

      await OrderModel.findByIdAndUpdate(orderId, {
        status: "Failed",
        activePaymentIndex: payIdx,
        $set: {
          [`payments.${payIdx}.status`]: "FAILED",
          [`payments.${payIdx}.rawResponse`]: validation,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // Failed / Cancelled
    if (status === "FAILED") {
      await OrderModel.findByIdAndUpdate(orderId, {
        status: "Failed",
        activePaymentIndex: payIdx,
        $set: { [`payments.${payIdx}.status`]: "FAILED" },
      });
      return NextResponse.json({ ok: true });
    }

    if (status === "CANCELLED") {
      await OrderModel.findByIdAndUpdate(orderId, {
        status: "Cancelled",
        activePaymentIndex: payIdx,
        $set: { [`payments.${payIdx}.status`]: "CANCELLED" },
      });
      return NextResponse.json({ ok: true });
    }

    // Unknown status
    await OrderModel.findByIdAndUpdate(orderId, {
      activePaymentIndex: payIdx,
      $set: { [`payments.${payIdx}.rawResponse`]: { ipnStatus: status || "UNKNOWN" } },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    // still return 200 to prevent retries storm
    return NextResponse.json({ ok: true });
  }
}

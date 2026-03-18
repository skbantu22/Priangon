import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";

export async function POST(req) {
  try {
    await connectDB();
    
    // Use text() and URLSearchParams for maximum compatibility
    const bodyText = await req.text();
    const data = Object.fromEntries(new URLSearchParams(bodyText));

    console.log("SSL Data Received:", data);

    // Try multiple sources for ID
    let orderId = data.value_a;
    if (!orderId || orderId === "unknown") {
      const parts = data.tran_id?.split('_');
      if (parts?.length > 1) orderId = parts[1];
    }

    const status = data.status?.toUpperCase();
    const isSuccessful = ["VALID", "VALIDATED", "SUCCESS"].includes(status);

    if (isSuccessful && orderId) {
      await OrderModel.findByIdAndUpdate(orderId, {
        $set: {
          status: "Paid",
          "payments.0.status": "SUCCESS",
          "payments.0.trxId": data.bank_tran_id || data.tran_id,
          "payments.0.valId": data.val_id,
          "payments.0.paidAt": new Date()
        }
      });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/order/success?id=${orderId}`, 303);
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/order/failed?id=${orderId || "unknown"}&reason=${status}`, 303);
  } catch (error) {
    console.error("Callback Error:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/order/failed?reason=error`, 303);
  }
}
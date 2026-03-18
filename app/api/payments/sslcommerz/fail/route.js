import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";

export async function POST(req) {
  try {
    await connectDB();
    const formData = await req.formData();
    const data = Object.fromEntries(formData);
    const orderId = data.value_a;

    if (orderId) {
      await OrderModel.findByIdAndUpdate(orderId, {
        $set: {
          status: "Failed",
          "payments.0.status": "FAILED",
          "payments.0.rawResponse": data,
        },
      });
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/order/failed?id=${orderId}`,
      303
    );
  } catch (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/cart`);
  }
}
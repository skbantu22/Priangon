import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";

export async function POST(req) {
  try {
    await connectDB();

    // SSLCommerz sends data as application/x-www-form-urlencoded
    const formData = await req.formData();
    const data = Object.fromEntries(formData);

    // value_a contains the Order ID we passed during initialization
    const orderId = data.value_a;

    if (orderId) {
      await OrderModel.findByIdAndUpdate(orderId, {
        $set: {
          status: "Cancelled",
          "payments.0.status": "CANCELLED",
          "payments.0.rawResponse": data,
        },
      });
    }

    // Redirect user back to the frontend UI
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/order/cancelled?id=${orderId}`,
      303
    );
  } catch (error) {
    console.error("SSL Cancel Error:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/cart`);
  }
}
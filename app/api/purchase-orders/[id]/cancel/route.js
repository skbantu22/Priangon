import mongoose from "mongoose";
import { NextResponse } from "next/server";

import PurchaseOrder from "@/models/PurchaseOrder.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

/** The supplier will not deliver; the order stays in the list as cancelled */
export async function POST(req, { params }) {
  try {
    const auth = await requirePermission("purchase.order");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    const order = mongoose.isValidObjectId(id)
      ? await PurchaseOrder.findOne({ _id: id, deletedAt: null })
      : null;

    if (!order) {
      return NextResponse.json({ success: false, message: "Purchase order not found" }, { status: 404 });
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        { success: false, message: `Only a pending order can be cancelled; ${order.orderNumber} is ${order.status}` },
        { status: 409 },
      );
    }

    order.status = "cancelled";
    await order.save();

    return NextResponse.json({ success: true, message: `${order.orderNumber} cancelled` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

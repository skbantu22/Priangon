import mongoose from "mongoose";
import { NextResponse } from "next/server";

import PurchaseOrder from "@/models/PurchaseOrder.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { fillOrder } from "@/lib/purchaseOrderService";

const notFound = () =>
  NextResponse.json({ success: false, message: "Purchase order not found" }, { status: 404 });

async function find(params) {
  const { id } = await params;

  return mongoose.isValidObjectId(id) ? PurchaseOrder.findOne({ _id: id, deletedAt: null }) : null;
}

export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("purchase.view");
    if (auth.response) return auth.response;

    await connectDB();

    const order = await find(params);
    if (!order) return notFound();

    await order.populate("supplierId", "name companyName phone email address");

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Only a pending order can change; a received one is a purchase now */
export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission("purchase.order");
    if (auth.response) return auth.response;

    await connectDB();

    const order = await find(params);
    if (!order) return notFound();

    if (order.status !== "pending") {
      return NextResponse.json(
        { success: false, message: `${order.orderNumber} is ${order.status} and cannot be edited` },
        { status: 409 },
      );
    }

    try {
      await fillOrder(order, await req.json(), await actorFullName(auth));
    } catch (formError) {
      return NextResponse.json({ success: false, message: formError.message }, { status: 400 });
    }

    await order.save();

    return NextResponse.json({ success: true, message: `${order.orderNumber} updated`, data: order });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("purchase.order");
    if (auth.response) return auth.response;

    await connectDB();

    const order = await find(params);
    if (!order) return notFound();

    if (order.status === "received") {
      return NextResponse.json(
        {
          success: false,
          message: `${order.orderNumber} was received as ${order.purchaseNumber}. Cancel that purchase first.`,
        },
        { status: 409 },
      );
    }

    order.deletedAt = new Date();
    await order.save();

    return NextResponse.json({ success: true, message: `${order.orderNumber} deleted` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

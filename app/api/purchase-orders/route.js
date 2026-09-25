import mongoose from "mongoose";
import { NextResponse } from "next/server";

import PurchaseOrder from "@/models/PurchaseOrder.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { fillOrder } from "@/lib/purchaseOrderService";

/** Purchase orders with filters, one page at a time, and the filtered total */
export async function GET(req) {
  try {
    const auth = await requirePermission("purchase.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = { deletedAt: null };

    const status = searchParams.get("status");
    if (["pending", "received", "cancelled"].includes(status)) filter.status = status;

    const supplierId = searchParams.get("supplierId");
    if (mongoose.isValidObjectId(supplierId)) filter.supplierId = new mongoose.Types.ObjectId(supplierId);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from || to) {
      filter.orderDate = {};
      if (from) filter.orderDate.$gte = new Date(`${from}T00:00:00`);
      if (to) filter.orderDate.$lte = new Date(`${to}T23:59:59.999`);
    }

    const search = searchParams.get("search")?.trim();

    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { orderNumber: { $regex: escaped, $options: "i" } },
        { reference: { $regex: escaped, $options: "i" } },
        { supplierName: { $regex: escaped, $options: "i" } },
      ];
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const [orders, total, sums] = await Promise.all([
      PurchaseOrder.find(filter)
        .select("-items")
        .sort({ orderDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(filter),
      PurchaseOrder.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      from: total ? (page - 1) * limit + 1 : 0,
      hasMore: page * limit < total,
      totals: { total: sums[0]?.total || 0 },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("purchase.order");
    if (auth.response) return auth.response;

    await connectDB();

    const order = new PurchaseOrder({ status: "pending" });

    try {
      await fillOrder(order, await req.json(), await actorFullName(auth));
    } catch (formError) {
      return NextResponse.json({ success: false, message: formError.message }, { status: 400 });
    }

    await order.save();

    return NextResponse.json(
      { success: true, message: `Purchase order ${order.orderNumber} saved`, data: order },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

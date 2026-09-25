import mongoose from "mongoose";
import { NextResponse } from "next/server";

import PurchaseReturn from "@/models/PurchaseReturn.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { createPurchaseReturn } from "@/lib/purchaseReturnService";

/** Returns sent back to suppliers, one page at a time, with filtered totals */
export async function GET(req) {
  try {
    const auth = await requirePermission("purchase.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = { deletedAt: null };

    const supplierId = searchParams.get("supplierId");
    if (mongoose.isValidObjectId(supplierId)) filter.supplierId = new mongoose.Types.ObjectId(supplierId);

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from || to) {
      filter.returnDate = {};
      if (from) filter.returnDate.$gte = new Date(`${from}T00:00:00`);
      if (to) filter.returnDate.$lte = new Date(`${to}T23:59:59.999`);
    }

    const search = searchParams.get("search")?.trim();

    if (search) {
      const regex = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ returnNumber: regex }, { supplierName: regex }, { "items.purchaseNumber": regex }];
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const [returns, total, sums] = await Promise.all([
      PurchaseReturn.find(filter)
        .sort({ returnDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PurchaseReturn.countDocuments(filter),
      PurchaseReturn.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: "$total" }, refund: { $sum: "$refundAmount" } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: returns.map((ret) => ({
        ...ret,
        quantity: ret.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
      })),
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      from: total ? (page - 1) * limit + 1 : 0,
      hasMore: page * limit < total,
      totals: { total: sums[0]?.total || 0, refund: sums[0]?.refund || 0 },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("purchase.return");
    if (auth.response) return auth.response;

    await connectDB();

    let ret;

    try {
      ret = await createPurchaseReturn(await req.json(), await actorFullName(auth));
    } catch (formError) {
      return NextResponse.json({ success: false, message: formError.message }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: `Purchase return ${ret.returnNumber} saved`, data: ret },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

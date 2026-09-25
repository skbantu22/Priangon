import { NextResponse } from "next/server";
import mongoose from "mongoose";
import PurchaseModel from "@/models/Purchase.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

export async function GET(req) {
  try {
    const auth = await requirePermission("purchase.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    const status = searchParams.get("status");
    if (status && status !== "all") filter.status = status;

    const paymentStatus = searchParams.get("paymentStatus");
    if (paymentStatus && paymentStatus !== "all") {
      filter.paymentStatus = paymentStatus;
    }

    const supplierId = searchParams.get("supplierId");
    if (supplierId && mongoose.isValidObjectId(supplierId)) {
      // cast: the totals aggregate does not cast strings the way find() does
      filter.supplierId = new mongoose.Types.ObjectId(supplierId);
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from || to) {
      filter.purchaseDate = {};
      if (from) filter.purchaseDate.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.purchaseDate.$lte = end;
      }
    }

    const search = searchParams.get("search")?.trim();

    if (search) {
      filter.$or = [
        { purchaseNumber: { $regex: search, $options: "i" } },
        { referenceNo: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
      ];
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 20);

    // totals of every purchase in the filter; a cancelled one owes nothing
    const [purchases, total, sums] = await Promise.all([
      PurchaseModel.find(filter)
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PurchaseModel.countDocuments(filter),
      PurchaseModel.aggregate([
        { $match: { ...filter, status: filter.status || { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            grandTotal: { $sum: "$grandTotal" },
            paidAmount: { $sum: "$paidAmount" },
            dismissAmount: { $sum: "$dismissAmount" },
            dueAmount: { $sum: "$dueAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: purchases,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      from: total ? (page - 1) * limit + 1 : 0,
      totals: sums[0] || { grandTotal: 0, paidAmount: 0, dismissAmount: 0, dueAmount: 0, count: 0 },
      hasMore: page * limit < total,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

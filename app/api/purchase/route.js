import { NextResponse } from "next/server";
import PurchaseModel from "@/models/Purchase.model";
import { connectDB } from "@/lib/databaseconnection";

export async function GET(req) {
  try {
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
    if (supplierId) filter.supplierId = supplierId;

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

    const [purchases, total] = await Promise.all([
      PurchaseModel.find(filter)
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PurchaseModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: purchases,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import PurchaseModel from "@/models/Purchase.model";
import PurchaseReturn from "@/models/PurchaseReturn.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("purchase.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const purchase = mongoose.isValidObjectId(id)
      ? await PurchaseModel.findOne({ _id: id, deletedAt: null })
          .populate("supplierId", "name companyName phone email address")
          .lean()
      : null;

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "Purchase not found" },
        { status: 404 },
      );
    }

    // goods from this purchase that went back to the supplier
    const returns = await PurchaseReturn.find({ "items.purchaseId": purchase._id, deletedAt: null })
      .select("returnNumber returnDate items total")
      .sort({ returnDate: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        ...purchase,
        returns: returns.map((ret) => ({
          _id: ret._id,
          returnNumber: ret.returnNumber,
          returnDate: ret.returnDate,
          total: ret.items
            .filter((item) => String(item.purchaseId) === String(purchase._id))
            .reduce((sum, item) => sum + (Number(item.total) || 0), 0),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

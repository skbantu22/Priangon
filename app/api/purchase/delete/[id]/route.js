import { NextResponse } from "next/server";
import PurchaseModel from "@/models/Purchase.model";
import { connectDB } from "@/lib/databaseconnection";
import { reversePurchaseStock } from "@/lib/purchaseService";

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const purchase = await PurchaseModel.findOne({ _id: id, deletedAt: null });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "Purchase not found" },
        { status: 404 },
      );
    }

    if (purchase.paidAmount > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This purchase already has a payment against it, so it cannot be deleted.",
        },
        { status: 409 },
      );
    }

    // Received goods have to come back out of stock first, and that
    // only works while the units are still in the warehouse
    if (purchase.status === "received") {
      await reversePurchaseStock(purchase, { createdBy: purchase.createdBy });
    }

    purchase.status = "cancelled";
    purchase.deletedAt = new Date();
    await purchase.save();

    return NextResponse.json({
      success: true,
      message: "Purchase cancelled and stock reversed",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

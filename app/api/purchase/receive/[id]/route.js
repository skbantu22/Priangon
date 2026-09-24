import { NextResponse } from "next/server";
import PurchaseModel from "@/models/Purchase.model";
import { connectDB } from "@/lib/databaseconnection";
import { applyPurchaseToStock } from "@/lib/purchaseService";

export async function POST(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json().catch(() => ({}));

    const purchase = await PurchaseModel.findOne({ _id: id, deletedAt: null });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "Purchase not found" },
        { status: 404 },
      );
    }

    if (purchase.status === "received") {
      return NextResponse.json(
        { success: false, message: "This purchase is already received" },
        { status: 409 },
      );
    }

    if (purchase.status === "cancelled") {
      return NextResponse.json(
        { success: false, message: "A cancelled purchase cannot be received" },
        { status: 409 },
      );
    }

    // Mark it first so a second click cannot add the stock twice
    purchase.status = "received";
    purchase.receivedAt = new Date();
    await purchase.save();

    try {
      await applyPurchaseToStock(purchase, {
        createdBy: body.createdBy?.trim() || purchase.createdBy,
      });
    } catch (stockError) {
      purchase.status = "pending";
      purchase.receivedAt = null;
      await purchase.save();

      throw stockError;
    }

    return NextResponse.json({
      success: true,
      message: "Purchase received and stock updated",
      data: purchase,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

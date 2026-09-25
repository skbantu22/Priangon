import { NextResponse } from "next/server";
import PurchaseModel from "@/models/Purchase.model";
import PurchaseOrder from "@/models/PurchaseOrder.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { reversePurchaseStock } from "@/lib/purchaseService";

export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("purchase.cancel");
    if (auth.response) return auth.response;

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

    // Returned units already left stock once; reversing the whole purchase
    // would take them out a second time
    if (purchase.items.some((item) => Number(item.returnedQty) > 0)) {
      return NextResponse.json(
        {
          success: false,
          message: "Goods from this purchase were returned to the supplier. Delete those returns first.",
        },
        { status: 409 },
      );
    }

    // Received goods have to come back out of stock first, and that
    // only works while the units are still in the warehouse
    if (purchase.status === "received") {
      await reversePurchaseStock(purchase, { createdBy: await actorFullName(auth) });
    }

    purchase.status = "cancelled";
    purchase.deletedAt = new Date();
    await purchase.save();

    // the order it received is open again, so it can be received anew
    if (purchase.purchaseOrderId) {
      await PurchaseOrder.updateOne(
        { _id: purchase.purchaseOrderId, status: "received" },
        { $set: { status: "pending", purchaseId: null, purchaseNumber: "" } },
      );
    }

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

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { allowedLocation, applyStockChange } from "@/lib/stockService";

import StockTransfer from "@/models/StockTransfer.model";

/**
 * Sends an incoming transfer back.
 *
 * The units went out of the sender's figure when it was sent, so they
 * are put back there - nothing is added at this end, because nothing
 * was accepted.
 *
 * Either end may reject: the receiving branch because the goods never
 * arrived or came damaged, the sending branch because it was sent by
 * mistake and wants its stock back.
 */
export async function POST(req, { params }) {
  try {
    const auth = await requirePermission("stock.transfer");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Unknown transfer" },
        { status: 400 },
      );
    }

    const transfer = await StockTransfer.findOne({ _id: id, deletedAt: null });

    if (!transfer) {
      return NextResponse.json(
        { success: false, message: "Transfer not found" },
        { status: 404 },
      );
    }

    if (transfer.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          message: `This transfer was already ${transfer.status}`,
        },
        { status: 400 },
      );
    }

    const destination = {
      locationType: transfer.toType,
      locationId: transfer.toId,
    };

    const source = {
      locationType: transfer.fromType,
      locationId: transfer.fromId,
    };

    if (!allowedLocation(auth, destination) && !allowedLocation(auth, source)) {
      return NextResponse.json(
        { success: false, message: "This transfer is not yours to cancel" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason || "").trim();

    for (const item of transfer.items) {
      await applyStockChange({
        ...source,
        productId: item.productId,
        variantId: item.variantId,
        delta: item.quantity,
        type: "TRANSFER_IN",
        note: `${transfer.transferNumber} returned${reason ? ` (${reason})` : ""}`,
        createdBy: auth.role || "",
        productName: item.productName,
      });

      item.receivedQuantity = 0;
    }

    transfer.status = "rejected";
    transfer.rejectedAt = new Date();
    transfer.rejectReason = reason;

    await transfer.save();

    return NextResponse.json({
      success: true,
      message: `${transfer.transferNumber} sent back to ${transfer.fromName}`,
      data: transfer,
    });
  } catch (error) {
    console.error("TRANSFER REJECT ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not reject transfer" },
      { status: 500 },
    );
  }
}

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requireAnyPermission } from "@/lib/apiAuth";
import { SHOWROOM, applyStockChange } from "@/lib/stockService";

import StockTransfer from "@/models/StockTransfer.model";

/**
 * Puts a pending transfer onto the sale-center shelf.
 *
 * The warehouse already gave the units up. Receiving is the other half,
 * and a failure on a later line puts the earlier lines back.
 */
export async function POST(_req, { params }) {
  try {
    const auth = await requireAnyPermission(["stock.transfer", "stock.adjust"]);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, message: "Unknown transfer" },
        { status: 400 },
      );
    }

    const transfer = await StockTransfer.findById(id);

    if (!transfer) {
      return NextResponse.json(
        { success: false, message: "That transfer no longer exists" },
        { status: 404 },
      );
    }

    if (transfer.status === "received") {
      return NextResponse.json(
        { success: false, message: `${transfer.transferNumber} is already received` },
        { status: 400 },
      );
    }

    const receivedBy = await actorFullName(auth);
    const note = `${transfer.transferNumber} received at ${transfer.toName}`;
    const landed = [];

    try {
      for (const item of transfer.items) {
        await applyStockChange({
          locationType: SHOWROOM,
          locationId: String(transfer.toId),
          productId: item.productId,
          variantId: item.variantId,
          delta: item.quantity,
          type: "TRANSFER_IN",
          note,
          createdBy: receivedBy,
          productName: item.productName,
        });

        landed.push(item);
      }
    } catch (moveError) {
      for (const item of landed) {
        await applyStockChange({
          locationType: SHOWROOM,
          locationId: String(transfer.toId),
          productId: item.productId,
          variantId: item.variantId,
          delta: -item.quantity,
          type: "TRANSFER_OUT",
          note: `${transfer.transferNumber} receive reversed`,
          createdBy: receivedBy,
          productName: item.productName,
        });
      }

      throw moveError;
    }

    transfer.status = "received";
    transfer.receivedAt = new Date();
    transfer.receivedBy = receivedBy;
    await transfer.save();

    return NextResponse.json({
      success: true,
      message: `${transfer.transferNumber} received at ${transfer.toName}`,
      data: transfer,
    });
  } catch (error) {
    console.error("TRANSFER RECEIVE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not receive this transfer" },
      { status: 500 },
    );
  }
}

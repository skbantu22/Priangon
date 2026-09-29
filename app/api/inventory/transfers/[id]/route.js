import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requireAnyPermission, requirePermission } from "@/lib/apiAuth";
import { SHOWROOM, applyStockChange } from "@/lib/stockService";
import { resolveTransferSource } from "@/lib/posTillAuth";

import StockTransfer from "@/models/StockTransfer.model";

function lineQuantity(transfer) {
  if (Number(transfer.totalQuantity) > 0) return Number(transfer.totalQuantity);
  return (transfer.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

async function returnPendingToSender(transfer, createdBy, note) {
  const restored = [];

  try {
    for (const item of transfer.items) {
      await applyStockChange({
        locationType: SHOWROOM,
        locationId: String(transfer.fromId),
        productId: item.productId,
        variantId: item.variantId,
        delta: item.quantity,
        type: "TRANSFER_IN",
        note,
        createdBy,
        productName: item.productName,
      });

      restored.push(item);
    }
  } catch (moveError) {
    for (const item of restored) {
      await applyStockChange({
        locationType: SHOWROOM,
        locationId: String(transfer.fromId),
        productId: item.productId,
        variantId: item.variantId,
        delta: -item.quantity,
        type: "TRANSFER_OUT",
        note: `${transfer.transferNumber} delete reversed`,
        createdBy,
        productName: item.productName,
      });
    }

    throw moveError;
  }

  return restored;
}

/** Single transfer for the print / view bill */
export async function GET(_req, { params }) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Unknown transfer" }, { status: 400 });
    }

    const transfer = await StockTransfer.findById(id).lean();

    if (!transfer) {
      return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...transfer, totalQuantity: lineQuantity(transfer) },
    });
  } catch (error) {
    console.error("TRANSFER GET ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load transfer" },
      { status: 500 },
    );
  }
}

/**
 * Removes a transfer row.
 * Sender: pending only — stock returns to sender.
 * Receiver: pending — stock returns to sender; rejected — row only (stock already back).
 * Confirmed transfers cannot be deleted.
 */
export async function DELETE(req, { params }) {
  try {
    const auth = await requireAnyPermission(["stock.transfer", "stock.adjust"]);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Unknown transfer" }, { status: 400 });
    }

    let body = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const shop = await resolveTransferSource(auth, body.showroomId);

    if (shop.error) {
      return NextResponse.json({ success: false, message: shop.error }, { status: 400 });
    }

    const transfer = await StockTransfer.findById(id);

    if (!transfer) {
      return NextResponse.json(
        { success: false, message: "That transfer no longer exists" },
        { status: 404 },
      );
    }

    const isSender = String(transfer.fromId) === String(shop.id);
    const isReceiver = String(transfer.toId) === String(shop.id);

    if (!isSender && !isReceiver) {
      return NextResponse.json(
        { success: false, message: "Only the sending or receiving shop can delete this transfer" },
        { status: 403 },
      );
    }

    if (transfer.status === "received" || transfer.destinationStockApplied) {
      return NextResponse.json(
        {
          success: false,
          message: `${transfer.transferNumber} is already confirmed and cannot be deleted`,
        },
        { status: 400 },
      );
    }

    if (isSender && transfer.status !== "pending" && transfer.status !== "rejected") {
      return NextResponse.json(
        {
          success: false,
          message: `${transfer.transferNumber} cannot be deleted in its current state`,
        },
        { status: 400 },
      );
    }

    if (isReceiver && transfer.status !== "pending" && transfer.status !== "rejected") {
      return NextResponse.json(
        {
          success: false,
          message: `${transfer.transferNumber} cannot be deleted in its current state`,
        },
        { status: 400 },
      );
    }

    const createdBy = await actorFullName(auth);

    if (transfer.status === "pending") {
      const note = `${transfer.transferNumber} deleted — returned to ${transfer.fromName}`;
      await returnPendingToSender(transfer, createdBy, note);
    }

    const removed = await StockTransfer.findOneAndDelete({
      _id: id,
      status: transfer.status,
      ...(isSender ? { fromId: transfer.fromId } : { toId: transfer.toId }),
    });

    if (!removed) {
      return NextResponse.json(
        { success: false, message: "Could not delete this transfer" },
        { status: 409 },
      );
    }

    const stockNote =
      transfer.status === "pending"
        ? ` — stock returned to ${removed.fromName}`
        : "";

    return NextResponse.json({
      success: true,
      message: `${removed.transferNumber} deleted${stockNote}`,
    });
  } catch (error) {
    console.error("TRANSFER DELETE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not delete transfer" },
      { status: 500 },
    );
  }
}

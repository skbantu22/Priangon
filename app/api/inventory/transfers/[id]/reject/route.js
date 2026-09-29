import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requireAnyPermission } from "@/lib/apiAuth";
import { SHOWROOM, applyStockChange } from "@/lib/stockService";
import { resolveTransferSource } from "@/lib/posTillAuth";

import StockTransfer from "@/models/StockTransfer.model";

/** Receiver rejects a pending transfer — stock returns to the sender shop. */
export async function POST(req, { params }) {
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

    if (String(transfer.toId) !== String(shop.id)) {
      return NextResponse.json(
        { success: false, message: "Only the receiving shop can reject this transfer" },
        { status: 403 },
      );
    }

    if (transfer.status === "received") {
      return NextResponse.json(
        { success: false, message: `${transfer.transferNumber} is already confirmed` },
        { status: 400 },
      );
    }

    if (transfer.status === "rejected") {
      return NextResponse.json(
        { success: false, message: `${transfer.transferNumber} is already rejected` },
        { status: 400 },
      );
    }

    const rejectedBy = await actorFullName(auth);
    const note = `${transfer.transferNumber} rejected at ${transfer.toName} — returned to ${transfer.fromName}`;
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
          createdBy: rejectedBy,
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
          note: `${transfer.transferNumber} reject reversed`,
          createdBy: rejectedBy,
          productName: item.productName,
        });
      }

      throw moveError;
    }

    const saved = await StockTransfer.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
          rejectedBy,
        },
      },
      { new: true },
    );

    if (!saved) {
      for (const item of restored) {
        await applyStockChange({
          locationType: SHOWROOM,
          locationId: String(transfer.fromId),
          productId: item.productId,
          variantId: item.variantId,
          delta: -item.quantity,
          type: "TRANSFER_OUT",
          note: `${transfer.transferNumber} duplicate reject reversed`,
          createdBy: rejectedBy,
          productName: item.productName,
        });
      }

      const current = await StockTransfer.findById(id).lean();

      if (current?.status === "rejected") {
        return NextResponse.json(
          { success: false, message: `${transfer.transferNumber} is already rejected` },
          { status: 400 },
        );
      }

      if (current?.status === "received") {
        return NextResponse.json(
          { success: false, message: `${transfer.transferNumber} is already confirmed` },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { success: false, message: "Could not reject this transfer" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${saved.transferNumber} rejected — stock returned to ${saved.fromName}`,
      data: saved,
    });
  } catch (error) {
    console.error("TRANSFER REJECT ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not reject this transfer" },
      { status: 500 },
    );
  }
}

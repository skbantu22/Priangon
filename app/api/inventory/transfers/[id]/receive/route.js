import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { allowedLocation, applyStockChange } from "@/lib/stockService";

import StockTransfer from "@/models/StockTransfer.model";

/**
 * Takes an incoming transfer into stock.
 *
 * The receiving side counts what actually turned up, so a row may be
 * received short. Whatever is missing goes back to the sender rather
 * than vanishing - a shortfall is an argument between two branches, not
 * a reason for units to stop existing.
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

    if (!allowedLocation(auth, destination)) {
      return NextResponse.json(
        { success: false, message: "This transfer is not addressed to you" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));

    // What the form counted in, matched back by variant
    const countedByVariant = new Map(
      (Array.isArray(body.items) ? body.items : []).map((raw) => [
        String(raw?.variantId),
        Number(raw?.receivedQuantity),
      ]),
    );

    const source = {
      locationType: transfer.fromType,
      locationId: transfer.fromId,
    };

    for (const item of transfer.items) {
      const asked = countedByVariant.get(String(item.variantId));

      const received =
        Number.isFinite(asked) && asked >= 0
          ? Math.min(Math.floor(asked), item.quantity)
          : item.quantity;

      if (received > 0) {
        await applyStockChange({
          ...destination,
          productId: item.productId,
          variantId: item.variantId,
          delta: received,
          type: "TRANSFER_IN",
          note: `${transfer.transferNumber} from ${transfer.fromName}`,
          createdBy: auth.role || "",
          productName: item.productName,
        });
      }

      const missing = item.quantity - received;

      if (missing > 0) {
        await applyStockChange({
          ...source,
          productId: item.productId,
          variantId: item.variantId,
          delta: missing,
          type: "TRANSFER_IN",
          note: `${transfer.transferNumber} short by ${missing}, returned`,
          createdBy: auth.role || "",
          productName: item.productName,
        });
      }

      item.receivedQuantity = received;
    }

    transfer.status = "received";
    transfer.receivedAt = new Date();
    transfer.receivedBy = auth.role || "";

    await transfer.save();

    return NextResponse.json({
      success: true,
      message: `${transfer.transferNumber} received`,
      data: transfer,
    });
  } catch (error) {
    console.error("TRANSFER RECEIVE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not receive transfer" },
      { status: 500 },
    );
  }
}

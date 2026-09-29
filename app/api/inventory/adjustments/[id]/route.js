import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { resolveTransferSource } from "@/lib/posTillAuth";
import { SHOWROOM, applyStockChange } from "@/lib/stockService";

import StockAdjustment from "@/models/StockAdjustment.model";

async function reverseAndRemove(adjustment, location, createdBy) {
  for (const item of adjustment.items) {
    const reverseDelta = item.type === "add" ? -item.quantity : item.quantity;

    await applyStockChange({
      ...location,
      productId: item.productId,
      variantId: item.variantId,
      delta: reverseDelta,
      type: "ADJUSTMENT",
      note: `${adjustment.adjustmentNumber} deleted — reversed`,
      createdBy,
      productName: item.productName,
    });
  }

  adjustment.deletedAt = new Date();
  await adjustment.save();
}

export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Unknown adjustment" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const shop = await resolveTransferSource(auth, searchParams.get("showroomId"));

    if (shop.error) {
      return NextResponse.json({ success: false, message: shop.error }, { status: 400 });
    }

    const adjustment = await StockAdjustment.findOne({
      _id: id,
      deletedAt: null,
      locationType: SHOWROOM,
      locationId: shop.id,
    }).lean();

    if (!adjustment) {
      return NextResponse.json(
        { success: false, message: "Adjustment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: adjustment });
  } catch (error) {
    console.error("ADJUSTMENT GET ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load adjustment" },
      { status: 500 },
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("stock.adjust");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Unknown adjustment" }, { status: 400 });
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

    const location = { locationType: SHOWROOM, locationId: shop.id };

    const adjustment = await StockAdjustment.findOne({
      _id: id,
      deletedAt: null,
      locationType: SHOWROOM,
      locationId: shop.id,
    });

    if (!adjustment) {
      return NextResponse.json(
        { success: false, message: "Adjustment not found" },
        { status: 404 },
      );
    }

    await reverseAndRemove(adjustment, location, auth.role || "");

    return NextResponse.json({
      success: true,
      message: `${adjustment.adjustmentNumber} deleted and stock reversed`,
    });
  } catch (error) {
    console.error("ADJUSTMENT DELETE ONE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not delete adjustment" },
      { status: 500 },
    );
  }
}

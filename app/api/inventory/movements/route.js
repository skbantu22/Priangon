import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { SHOWROOM, allowedLocation, parseLocation } from "@/lib/stockService";

import InventoryTransaction from "@/models/InventoryTransaction.model";

import "@/models/ProductVariant.model ";

/** The recorded movements of one product at one location, newest first */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.history");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const productId = searchParams.get("productId");
    const location = parseLocation(searchParams.get("location"));

    if (!mongoose.isValidObjectId(productId) || !location) {
      return NextResponse.json(
        { success: false, message: "Select a product and a location" },
        { status: 400 },
      );
    }

    if (!allowedLocation(auth, location)) {
      return NextResponse.json(
        { success: false, message: "You cannot see stock there" },
        { status: 403 },
      );
    }

    const movements = await InventoryTransaction.find({
      productId,
      showroomId: location.locationType === SHOWROOM ? location.locationId : null,
    })
      .populate({ path: "variantId", select: "color size sku" })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      success: true,
      data: movements.map((row) => ({
        _id: String(row._id),
        date: row.createdAt,
        type: row.type,
        variantLabel: row.variantId
          ? [row.variantId.color, row.variantId.size].filter(Boolean).join(" / ")
          : "",
        change: (Number(row.newStock) || 0) - (Number(row.previousStock) || 0),
        quantity: Number(row.quantity) || 0,
        previousStock: Number(row.previousStock) || 0,
        newStock: Number(row.newStock) || 0,
        note: row.note || "",
        createdBy: row.createdBy || "",
      })),
    });
  } catch (error) {
    console.error("STOCK MOVEMENTS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load movements" },
      { status: 500 },
    );
  }
}

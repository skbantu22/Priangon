import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import {
  SHOWROOM,
  allowedLocation,
  applyStockChange,
  assertLocationExists,
  buildStockItems,
  locationKey,
  locationName,
  nextDocumentNumber,
  parseLocation,
  readStock,
} from "@/lib/stockService";

import StockAdjustment from "@/models/StockAdjustment.model";

const REASONS = ["damage", "lost", "theft", "expired", "found", "correction", "other"];

/** The adjustment list */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();
    const reason = searchParams.get("reason") || "all";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 25));

    const filter = { deletedAt: null };

    let location = searchParams.get("location") || "all";

    // A login tied to one showroom only reads that showroom's corrections
    if (auth.showroomId && auth.role !== "admin" && auth.role !== "manager") {
      location = String(auth.showroomId);
    }

    if (location !== "all") {
      const parsed = parseLocation(location);

      if (!parsed) {
        return NextResponse.json(
          { success: false, message: "Unknown location" },
          { status: 400 },
        );
      }

      filter.locationType = parsed.locationType;
      filter.locationId = parsed.locationId;
    }

    if (reason !== "all" && REASONS.includes(reason)) filter.reason = reason;

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      filter.$or = [
        { adjustmentNumber: pattern },
        { note: pattern },
        { "items.productName": pattern },
        { "items.sku": pattern },
      ];
    }

    const [data, total] = await Promise.all([
      StockAdjustment.find(filter)
        .sort({ adjustmentDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StockAdjustment.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("ADJUSTMENT LIST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load adjustments" },
      { status: 500 },
    );
  }
}

/**
 * Records a correction and moves the stock with it.
 *
 * Every row is rebuilt from the database and the whole basket is checked
 * against what is on hand before a single figure moves, so a correction
 * cannot half-apply and leave the count worse than it was found.
 */
export async function POST(req) {
  try {
    const auth = await requirePermission("stock.adjust");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const location = parseLocation(body.location);

    if (!location) {
      return NextResponse.json(
        { success: false, message: "Select a location" },
        { status: 400 },
      );
    }

    if (!allowedLocation(auth, location)) {
      return NextResponse.json(
        { success: false, message: "You cannot adjust stock there" },
        { status: 403 },
      );
    }

    if (!(await assertLocationExists(location))) {
      return NextResponse.json(
        { success: false, message: "That location no longer exists" },
        { status: 404 },
      );
    }

    let items;

    try {
      items = await buildStockItems(body.items);
    } catch (itemError) {
      return NextResponse.json(
        { success: false, message: itemError.message },
        { status: 400 },
      );
    }

    // The type comes from the row the form sent, matched back by variant
    const typeByVariant = new Map(
      (Array.isArray(body.items) ? body.items : []).map((raw) => [
        String(raw?.variantId),
        raw?.type === "add" ? "add" : "subtract",
      ]),
    );

    for (const item of items) {
      item.type = typeByVariant.get(String(item.variantId)) || "subtract";
    }

    // Check the whole basket first. The same variant can appear twice,
    // and both rows come out of the same figure.
    const needed = new Map();

    for (const item of items) {
      if (item.type !== "subtract") continue;

      const key = String(item.variantId);

      needed.set(key, {
        ...item,
        quantity: (needed.get(key)?.quantity || 0) + item.quantity,
      });
    }

    for (const need of needed.values()) {
      const onHand = await readStock({
        ...location,
        productId: need.productId,
        variantId: need.variantId,
      });

      if (onHand < need.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `"${need.productName}" has only ${onHand} in stock, so ${need.quantity} cannot be taken out`,
          },
          { status: 400 },
        );
      }
    }

    const reason = REASONS.includes(body.reason) ? body.reason : "correction";
    const note = String(body.note || "").trim();
    const name = await locationName(location);

    const adjustmentNumber = await nextDocumentNumber("ADJ", "stockAdjustment");

    for (const item of items) {
      const { previousStock, newStock } = await applyStockChange({
        ...location,
        productId: item.productId,
        variantId: item.variantId,
        delta: item.type === "add" ? item.quantity : -item.quantity,
        type: item.type === "add" ? "ADJUSTMENT" : reason === "damage" ? "DAMAGE" : "ADJUSTMENT",
        note: `${adjustmentNumber} — ${reason}${note ? ` (${note})` : ""}`,
        createdBy: auth.role || "",
        productName: item.productName,
      });

      item.previousStock = previousStock;
      item.newStock = newStock;
    }

    const adjustment = await StockAdjustment.create({
      adjustmentNumber,
      locationType: location.locationType,
      locationId: location.locationType === SHOWROOM ? location.locationId : null,
      locationName: name,
      adjustmentDate: body.adjustmentDate ? new Date(body.adjustmentDate) : new Date(),
      reason,
      items,
      totalAdded: items
        .filter((item) => item.type === "add")
        .reduce((sum, item) => sum + item.quantity, 0),
      totalSubtracted: items
        .filter((item) => item.type === "subtract")
        .reduce((sum, item) => sum + item.quantity, 0),
      note,
      createdBy: auth.role || "",
    });

    return NextResponse.json({
      success: true,
      message: `Adjustment ${adjustmentNumber} saved`,
      data: adjustment,
      location: locationKey(location),
    });
  } catch (error) {
    console.error("ADJUSTMENT CREATE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not save adjustment" },
      { status: 500 },
    );
  }
}

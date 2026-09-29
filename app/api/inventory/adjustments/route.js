import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission, requireAnyPermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { resolveTransferSource } from "@/lib/posTillAuth";
import {
  SHOWROOM,
  applyStockChange,
  assertLocationExists,
  buildStockItems,
  locationName,
  nextDocumentNumber,
  readStock,
} from "@/lib/stockService";

import ProductVariant from "@/models/ProductVariant.model ";
import StockAdjustment from "@/models/StockAdjustment.model";

const typeLabel = (type) => (type === "add" ? "Addition" : "Deduction");

function flattenAdjustment(adj) {
  return (adj.items || []).map((item, index) => ({
    key: `${adj._id}-${index}`,
    adjustmentId: String(adj._id),
    adjustmentNumber: adj.adjustmentNumber,
    adjustmentDate: adj.adjustmentDate,
    type: item.type,
    typeLabel: typeLabel(item.type),
    productName: item.productName,
    variantLabel: item.variantLabel,
    quantity: item.quantity,
    loss: Number(item.loss) || 0,
    status: adj.status || "confirmed",
  }));
}

function dateRangeFilter(from, to) {
  if (!from && !to) return null;

  const range = {};

  if (from) {
    const start = new Date(from);
    if (!Number.isNaN(start.getTime())) range.$gte = start;
  }

  if (to) {
    const end = new Date(to);
    if (!Number.isNaN(end.getTime())) {
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
  }

  return Object.keys(range).length ? range : null;
}

/** AmarSolution-style list for the current shop only */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const shop = await resolveTransferSource(auth, searchParams.get("showroomId"));

    if (shop.error) {
      return NextResponse.json({ success: false, message: shop.error }, { status: 400 });
    }

    const search = (searchParams.get("search") || "").trim();
    const type = searchParams.get("type") || "all";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 25));

    const filter = {
      deletedAt: null,
      locationType: SHOWROOM,
      locationId: shop.id,
    };

    const dateFilter = dateRangeFilter(
      searchParams.get("from"),
      searchParams.get("to"),
    );

    if (dateFilter) filter.adjustmentDate = dateFilter;

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      filter.$or = [
        { adjustmentNumber: pattern },
        { "items.productName": pattern },
        { "items.sku": pattern },
      ];
    }

    if (type === "add" || type === "subtract") {
      filter["items.type"] = type;
    }

    const adjustments = await StockAdjustment.find(filter)
      .sort({ adjustmentDate: -1, createdAt: -1 })
      .lean();

    let lines = adjustments.flatMap(flattenAdjustment);

    if (type === "add" || type === "subtract") {
      lines = lines.filter((row) => row.type === type);
    }

    const totalLoss = lines.reduce((sum, row) => sum + row.loss, 0);
    const total = lines.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const from = total ? (page - 1) * limit + 1 : 0;
    const slice = lines.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: slice,
      shopName: shop.name,
      page,
      limit,
      total,
      pages,
      from,
      totalLoss,
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
 * Saves an Addition or Deduction for the current shop and moves stock
 * immediately (status Confirmed).
 */
export async function POST(req) {
  try {
    const auth = await requirePermission("stock.adjust");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const shop = await resolveTransferSource(auth, body.showroomId);

    if (shop.error) {
      return NextResponse.json({ success: false, message: shop.error }, { status: 400 });
    }

    const location = { locationType: SHOWROOM, locationId: shop.id };

    if (!(await assertLocationExists(location))) {
      return NextResponse.json(
        { success: false, message: "That shop no longer exists" },
        { status: 404 },
      );
    }

    const adjustmentType = body.adjustmentType === "add" ? "add" : "subtract";

    let items;

    try {
      items = await buildStockItems(body.items);
    } catch (itemError) {
      return NextResponse.json(
        { success: false, message: itemError.message },
        { status: 400 },
      );
    }

    for (const item of items) {
      item.type = adjustmentType;
    }

    const variantRates = await ProductVariant.find({
      _id: { $in: items.map((item) => item.variantId) },
    })
      .select("purchasePrice")
      .lean();

    const rateByVariant = new Map(
      variantRates.map((row) => [String(row._id), Number(row.purchasePrice) || 0]),
    );

    for (const item of items) {
      const rate = rateByVariant.get(String(item.variantId)) || 0;
      item.purchaseRate = rate;
      item.loss = item.type === "subtract" ? item.quantity * rate : 0;
    }

    if (adjustmentType === "subtract") {
      const needed = new Map();

      for (const item of items) {
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
              message: `"${need.productName}" has only ${onHand} in stock here`,
            },
            { status: 400 },
          );
        }
      }
    }

    const name = await locationName(location);
    const adjustmentNumber = await nextDocumentNumber();

    for (const item of items) {
      const { previousStock, newStock } = await applyStockChange({
        ...location,
        productId: item.productId,
        variantId: item.variantId,
        delta: item.type === "add" ? item.quantity : -item.quantity,
        type: "ADJUSTMENT",
        note: `${adjustmentNumber} — ${typeLabel(item.type)}`,
        createdBy: auth.role || "",
        productName: item.productName,
      });

      item.previousStock = previousStock;
      item.newStock = newStock;
    }

    const totalLoss = items.reduce((sum, item) => sum + item.loss, 0);

    const adjustment = await StockAdjustment.create({
      adjustmentNumber,
      locationType: SHOWROOM,
      locationId: shop.id,
      locationName: name,
      adjustmentDate: body.adjustmentDate ? new Date(body.adjustmentDate) : new Date(),
      reason: "correction",
      status: "confirmed",
      items,
      totalAdded: items
        .filter((item) => item.type === "add")
        .reduce((sum, item) => sum + item.quantity, 0),
      totalSubtracted: items
        .filter((item) => item.type === "subtract")
        .reduce((sum, item) => sum + item.quantity, 0),
      totalLoss,
      note: String(body.note || "").trim(),
      createdBy: auth.role || "",
    });

    return NextResponse.json({
      success: true,
      message: `Adjustment ${adjustmentNumber} saved`,
      data: adjustment,
    });
  } catch (error) {
    console.error("ADJUSTMENT CREATE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not save adjustment" },
      { status: 500 },
    );
  }
}

/** Delete selected adjustments and reverse their stock at this shop */
export async function DELETE(req) {
  try {
    const auth = await requireAnyPermission(["stock.adjust"]);
    if (auth.response) return auth.response;

    await connectDB();

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

    const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))].filter(
      (id) => mongoose.isValidObjectId(id),
    );

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Select at least one adjustment" },
        { status: 400 },
      );
    }

    const location = { locationType: SHOWROOM, locationId: shop.id };
    const adjustments = await StockAdjustment.find({
      _id: { $in: ids },
      deletedAt: null,
      locationType: SHOWROOM,
      locationId: shop.id,
    });

    if (adjustments.length === 0) {
      return NextResponse.json(
        { success: false, message: "No matching adjustments to delete" },
        { status: 404 },
      );
    }

    for (const adjustment of adjustments) {
      for (const item of adjustment.items) {
        const reverseDelta = item.type === "add" ? -item.quantity : item.quantity;

        await applyStockChange({
          ...location,
          productId: item.productId,
          variantId: item.variantId,
          delta: reverseDelta,
          type: "ADJUSTMENT",
          note: `${adjustment.adjustmentNumber} deleted — reversed`,
          createdBy: auth.role || "",
          productName: item.productName,
        });
      }

      adjustment.deletedAt = new Date();
      await adjustment.save();
    }

    return NextResponse.json({
      success: true,
      message: `${adjustments.length} adjustment(s) deleted and stock reversed`,
      count: adjustments.length,
    });
  } catch (error) {
    console.error("ADJUSTMENT DELETE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not delete adjustments" },
      { status: 500 },
    );
  }
}

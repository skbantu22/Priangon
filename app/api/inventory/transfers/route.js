import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requireAnyPermission, requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import {
  SHOWROOM,
  applyStockChange,
  buildStockItems,
  nextDocumentNumber,
  readStock,
} from "@/lib/stockService";
import { resolveTransferSource } from "@/lib/posTillAuth";

import Showroom from "@/models/Showroom.model";
import StockTransfer from "@/models/StockTransfer.model";

const mergeItems = (items) => {
  const byVariant = new Map();

  for (const item of items) {
    const key = String(item.variantId);
    const existing = byVariant.get(key);

    if (!existing) byVariant.set(key, { ...item });
    else existing.quantity += item.quantity;
  }

  return [...byVariant.values()];
};

/** The other shop. It cannot be the shop the stock is leaving. */
async function resolveDestination(requested, sourceId) {
  const id = String(requested || "");

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return { error: "Select a branch" };
  }

  if (id === String(sourceId)) {
    return { error: "Choose a different branch. Stock cannot move to the same shop" };
  }

  const shop = await Showroom.findOne({ _id: id, isActive: { $ne: false } })
    .select("name")
    .lean();

  if (!shop) return { error: "That branch is not available" };

  return { id, name: shop.name };
}

/** Undoes stock already moved when a later line or the save fails */
async function undoMoves(moves, createdBy) {
  for (const move of [...moves].reverse()) {
    await applyStockChange({
      locationType: move.locationType,
      locationId: move.locationId,
      productId: move.productId,
      variantId: move.variantId,
      delta: -move.delta,
      type: move.delta < 0 ? "TRANSFER_IN" : "TRANSFER_OUT",
      note: `${move.note} reversed`,
      createdBy,
      productName: move.productName,
    });
  }
}

const dayStart = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const dayEnd = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const lineQuantity = (transfer) => {
  if (Number(transfer.totalQuantity) > 0) return Number(transfer.totalQuantity);
  return (transfer.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
};

/** Transferred and received lists share this paper trail */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const statusParam = searchParams.get("status") || "all";
    const status =
      statusParam === "confirmed" ? "received" : statusParam;
    const view = searchParams.get("view") || "transferred";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 25));

    const shop = await resolveTransferSource(auth, searchParams.get("showroomId"));

    if (shop.error) {
      return NextResponse.json({ success: false, message: shop.error }, { status: 400 });
    }

    const filter = {};

    if (view === "received") filter.toId = shop.id;
    else filter.fromId = shop.id;

    const branchId = String(searchParams.get("branchId") || "");

    if (/^[a-f\d]{24}$/i.test(branchId)) {
      if (view === "received") filter.fromId = branchId;
      else filter.toId = branchId;
    }

    const productId = String(searchParams.get("productId") || "");

    if (/^[a-f\d]{24}$/i.test(productId)) {
      filter["items.productId"] = productId;
    }

    if (status === "pending" || status === "received" || status === "rejected") {
      filter.status = status;
    }

    const from = dayStart(searchParams.get("from") || "");
    const to = dayEnd(searchParams.get("to") || "");

    if (from || to) {
      filter.transferDate = {};
      if (from) filter.transferDate.$gte = from;
      if (to) filter.transferDate.$lte = to;
    }

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      filter.$or = [
        { transferNumber: pattern },
        { fromName: pattern },
        { toName: pattern },
        { "items.productName": pattern },
        { "items.sku": pattern },
      ];
    }

    const [rawRows, total, qtyAgg] = await Promise.all([
      StockTransfer.find(filter)
        .sort({ transferDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StockTransfer.countDocuments(filter),
      StockTransfer.aggregate([
        { $match: filter },
        {
          $addFields: {
            lineQty: {
              $cond: {
                if: { $gt: ["$totalQuantity", 0] },
                then: "$totalQuantity",
                else: { $sum: "$items.quantity" },
              },
            },
          },
        },
        { $group: { _id: null, totalQuantity: { $sum: "$lineQty" } } },
      ]),
    ]);

    const data = rawRows.map((row) => ({ ...row, totalQuantity: lineQuantity(row) }));
    const totalQuantity = qtyAgg[0]?.totalQuantity || 0;
    const fromIndex = total ? (page - 1) * limit + 1 : 0;

    return NextResponse.json({
      success: true,
      data,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      from: fromIndex,
      totalQuantity,
    });
  } catch (error) {
    console.error("TRANSFER LIST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load transfers" },
      { status: 500 },
    );
  }
}

/**
 * Sends stock from the current shop toward another branch.
 *
 * Source stock leaves immediately; destination stock waits until Received
 * List confirms. A shortfall, the same shop on both sides, or a failed save
 * puts back anything already moved from the source.
 */
export async function POST(req) {
  try {
    const auth = await requireAnyPermission(["stock.transfer", "stock.adjust"]);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const source = await resolveTransferSource(auth, body.sourceId);

    if (source.error) {
      return NextResponse.json({ success: false, message: source.error }, { status: 400 });
    }

    const destination = await resolveDestination(body.toId, source.id);

    if (destination.error) {
      return NextResponse.json(
        { success: false, message: destination.error },
        { status: 400 },
      );
    }

    let items;

    try {
      items = mergeItems(await buildStockItems(body.items));
    } catch (itemError) {
      return NextResponse.json(
        { success: false, message: itemError.message },
        { status: 400 },
      );
    }

    for (const item of items) {
      const onHand = await readStock({
        locationType: SHOWROOM,
        locationId: source.id,
        productId: item.productId,
        variantId: item.variantId,
      });

      if (onHand < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `"${item.productName}" has only ${onHand} in ${source.name}, so ${item.quantity} cannot be transferred`,
          },
          { status: 400 },
        );
      }
    }

    const transferNumber = await nextDocumentNumber();
    const createdBy = await actorFullName(auth);
    const note = `${transferNumber} — ${source.name} to ${destination.name}`;
    const applied = [];

    try {
      for (const item of items) {
        const out = await applyStockChange({
          locationType: SHOWROOM,
          locationId: source.id,
          productId: item.productId,
          variantId: item.variantId,
          delta: -item.quantity,
          type: "TRANSFER_OUT",
          note,
          createdBy,
          productName: item.productName,
        });

        applied.push({
          locationType: SHOWROOM,
          locationId: source.id,
          productId: item.productId,
          variantId: item.variantId,
          delta: -item.quantity,
          productName: item.productName,
          note,
        });

        item.previousStock = out.previousStock;
        item.newStock = out.newStock;
      }
    } catch (moveError) {
      await undoMoves(applied, createdBy);
      throw moveError;
    }

    const transferDate = body.transferDate ? new Date(body.transferDate) : new Date();
    let transfer;

    try {
      transfer = await StockTransfer.create({
        transferNumber,
        transferDate: Number.isNaN(transferDate.getTime()) ? new Date() : transferDate,
        fromId: source.id,
        fromName: source.name,
        toId: destination.id,
        toName: destination.name,
        items,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        status: "pending",
        destinationStockApplied: false,
        createdBy,
        note: String(body.note || "").trim(),
      });
    } catch (saveError) {
      await undoMoves(applied, createdBy);
      throw saveError;
    }

    return NextResponse.json({
      success: true,
      message: `Transfer ${transferNumber} sent to ${destination.name}`,
      data: transfer,
    });
  } catch (error) {
    console.error("TRANSFER CREATE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not transfer stock" },
      { status: 500 },
    );
  }
}

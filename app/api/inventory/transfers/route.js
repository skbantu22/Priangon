import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requireAnyPermission, requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import {
  WAREHOUSE,
  applyStockChange,
  buildStockItems,
  nextDocumentNumber,
  readStock,
} from "@/lib/stockService";

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

/** The one counter that sells. Transfers land there, not on another branch. */
async function saleCenter() {
  return Showroom.findOne({ isSaleCenter: true, isActive: { $ne: false } })
    .sort({ createdAt: 1 })
    .select("name")
    .lean();
}

/** Puts warehouse stock back if a transfer cannot be finished */
async function restoreWarehouse(items, note, createdBy) {
  for (const item of items) {
    await applyStockChange({
      locationType: WAREHOUSE,
      locationId: null,
      productId: item.productId,
      variantId: item.variantId,
      delta: item.quantity,
      type: "TRANSFER_IN",
      note,
      createdBy,
      productName: item.productName,
    });
  }
}

/** Transferred and received lists share this paper trail */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 25));

    const filter = {};

    if (status === "pending" || status === "received") filter.status = status;

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      filter.$or = [
        { transferNumber: pattern },
        { toName: pattern },
        { "items.productName": pattern },
        { "items.sku": pattern },
      ];
    }

    const [data, total] = await Promise.all([
      StockTransfer.find(filter)
        .sort({ transferDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StockTransfer.countDocuments(filter),
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
    console.error("TRANSFER LIST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load transfers" },
      { status: 500 },
    );
  }
}

/**
 * Moves goods out of the warehouse toward the sale center.
 *
 * The shelf does not gain them yet. Received List is what puts them
 * on the counter. The whole basket is checked first, and a failure
 * puts back anything already taken out.
 */
export async function POST(req) {
  try {
    const auth = await requireAnyPermission(["stock.transfer", "stock.adjust"]);
    if (auth.response) return auth.response;

    await connectDB();

    const center = await saleCenter();

    if (!center) {
      return NextResponse.json(
        { success: false, message: "Set a sale center before transferring stock" },
        { status: 400 },
      );
    }

    const body = await req.json();
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
        locationType: WAREHOUSE,
        locationId: null,
        productId: item.productId,
        variantId: item.variantId,
      });

      if (onHand < item.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `"${item.productName}" has only ${onHand} in the warehouse, so ${item.quantity} cannot be transferred`,
          },
          { status: 400 },
        );
      }
    }

    const transferNumber = await nextDocumentNumber();
    const createdBy = await actorFullName(auth);
    const note = `${transferNumber} — warehouse to ${center.name}`;
    const moved = [];

    try {
      for (const item of items) {
        const result = await applyStockChange({
          locationType: WAREHOUSE,
          locationId: null,
          productId: item.productId,
          variantId: item.variantId,
          delta: -item.quantity,
          type: "TRANSFER_OUT",
          note,
          createdBy,
          productName: item.productName,
        });

        item.previousStock = result.previousStock;
        item.newStock = result.newStock;
        moved.push(item);
      }
    } catch (moveError) {
      await restoreWarehouse(moved, `${transferNumber} reversed`, createdBy);
      throw moveError;
    }

    const transferDate = body.transferDate ? new Date(body.transferDate) : new Date();
    let transfer;

    try {
      transfer = await StockTransfer.create({
        transferNumber,
        transferDate: Number.isNaN(transferDate.getTime()) ? new Date() : transferDate,
        fromName: "Warehouse",
        toId: center._id,
        toName: center.name,
        items,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        status: "pending",
        createdBy,
        note: String(body.note || "").trim(),
      });
    } catch (saveError) {
      await restoreWarehouse(moved, `${transferNumber} reversed`, createdBy);
      throw saveError;
    }

    return NextResponse.json({
      success: true,
      message: `Transfer ${transferNumber} sent to ${center.name}`,
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

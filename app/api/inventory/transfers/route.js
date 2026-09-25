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
  locationName,
  nextDocumentNumber,
  parseLocation,
  readStock,
} from "@/lib/stockService";

import StockTransfer from "@/models/StockTransfer.model";

/**
 * The transferred (sent) and received (incoming) lists.
 *
 * Both read the same collection from opposite ends, so one route serves
 * both screens and the two lists can never disagree about a transfer.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const direction = searchParams.get("direction") || "sent"; // sent | received | all
    const status = searchParams.get("status") || "all";
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(10, Number(searchParams.get("limit")) || 25));

    let location = searchParams.get("location") || "all";

    // A login tied to one showroom sees that showroom's end of things
    if (auth.showroomId && auth.role !== "admin" && auth.role !== "manager") {
      location = String(auth.showroomId);
    }

    const filter = { deletedAt: null };

    if (location !== "all") {
      const parsed = parseLocation(location);

      if (!parsed) {
        return NextResponse.json(
          { success: false, message: "Unknown location" },
          { status: 400 },
        );
      }

      if (direction === "sent") {
        filter.fromType = parsed.locationType;
        filter.fromId = parsed.locationId;
      } else if (direction === "received") {
        filter.toType = parsed.locationType;
        filter.toId = parsed.locationId;
      } else {
        filter.$and = [
          {
            $or: [
              { fromType: parsed.locationType, fromId: parsed.locationId },
              { toType: parsed.locationType, toId: parsed.locationId },
            ],
          },
        ];
      }
    }

    if (["pending", "received", "rejected"].includes(status)) {
      filter.status = status;
    }

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      const searchOr = [
        { transferNumber: pattern },
        { note: pattern },
        { fromName: pattern },
        { toName: pattern },
        { "items.productName": pattern },
        { "items.sku": pattern },
      ];

      // Keep the location clause intact - an $or written straight onto
      // the filter would replace it and leak another branch's rows
      if (filter.$and) {
        filter.$and.push({ $or: searchOr });
      } else {
        filter.$or = searchOr;
      }
    }

    const [data, total, pending] = await Promise.all([
      StockTransfer.find(filter)
        .sort({ transferDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StockTransfer.countDocuments(filter),
      StockTransfer.countDocuments({ ...filter, status: "pending" }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      pending,
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
 * Sends stock from one place to another.
 *
 * The units leave the source now and only arrive when the other side
 * receives them - in between they sit against the transfer itself, which
 * is what stops the same phone being sold in two showrooms at once.
 */
export async function POST(req) {
  try {
    const auth = await requirePermission("stock.transfer");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const from = parseLocation(body.from);
    const to = parseLocation(body.to);

    if (!from || !to) {
      return NextResponse.json(
        {
          success: false,
          message: "Select where the stock is going from and to",
        },
        { status: 400 },
      );
    }

    if (
      from.locationType === to.locationType &&
      String(from.locationId) === String(to.locationId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Stock cannot be transferred to the same place",
        },
        { status: 400 },
      );
    }

    if (!allowedLocation(auth, from)) {
      return NextResponse.json(
        { success: false, message: "You cannot send stock from there" },
        { status: 403 },
      );
    }

    if (!(await assertLocationExists(from)) || !(await assertLocationExists(to))) {
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

    // The same variant can be on two rows, and both come out of the same
    // figure - add them up before anything is checked
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
        ...from,
        productId: need.productId,
        variantId: need.variantId,
      });

      if (onHand < need.quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `"${need.productName}" has only ${onHand} at the sending end, so ${need.quantity} cannot be sent`,
          },
          { status: 400 },
        );
      }
    }

    const [fromName, toName] = await Promise.all([
      locationName(from),
      locationName(to),
    ]);

    const transferNumber = await nextDocumentNumber("TRF", "stockTransfer");
    const note = String(body.note || "").trim();

    for (const item of items) {
      await applyStockChange({
        ...from,
        productId: item.productId,
        variantId: item.variantId,
        delta: -item.quantity,
        type: "TRANSFER_OUT",
        note: `${transferNumber} to ${toName}`,
        createdBy: auth.role || "",
        productName: item.productName,
      });
    }

    const transfer = await StockTransfer.create({
      transferNumber,
      fromType: from.locationType,
      fromId: from.locationType === SHOWROOM ? from.locationId : null,
      fromName,
      toType: to.locationType,
      toId: to.locationType === SHOWROOM ? to.locationId : null,
      toName,
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      status: "pending",
      transferDate: body.transferDate ? new Date(body.transferDate) : new Date(),
      note,
      createdBy: auth.role || "",
    });

    return NextResponse.json({
      success: true,
      message: `Transfer ${transferNumber} sent to ${toName}`,
      data: transfer,
    });
  } catch (error) {
    console.error("TRANSFER CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Could not send the transfer",
      },
      { status: 500 },
    );
  }
}

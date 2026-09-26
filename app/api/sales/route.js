import mongoose from "mongoose";
import { NextResponse } from "next/server";

import POSOrder from "@/models/posorder.model";
import SaleReturn from "@/models/SaleReturn.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";

const TYPES = ["retail", "dealer", "subDealer", "wholesaler"];
const PAYMENT = {
  paid: { dueAmount: { $lte: 0.009 } },
  partial: { dueAmount: { $gt: 0.009 }, paidAmount: { $gt: 0 } },
  due: { dueAmount: { $gt: 0.009 }, paidAmount: { $lte: 0 } },
};

const paymentStatus = (paid, due) => (due > 0.009 ? (paid > 0 ? "Partial Due" : "Due") : "Paid");

/**
 * Sale List, like 360's "Manage Pos Sale": every POS invoice with paid /
 * due, filters and totals. ?customerType splits Buyer, Dealer, Sub Dealer
 * and Wholesaler sales; ?exchange=1 lists exchanges.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("orders.view");
    if (auth.response) return auth.response;

    await connectDB();

    const q = new URL(req.url).searchParams;
    const filter = { status: "completed" };

    if (TYPES.includes(q.get("customerType"))) {
      filter.customerType = q.get("customerType") === "retail" ? { $in: ["retail", null] } : q.get("customerType");
    }
    if (q.get("exchange") === "1") filter.orderType = "exchange";
    if (mongoose.isValidObjectId(q.get("customerId"))) filter.customerId = new mongoose.Types.ObjectId(q.get("customerId"));
    if (mongoose.isValidObjectId(q.get("showroomId"))) filter.showroomId = new mongoose.Types.ObjectId(q.get("showroomId"));
    if (q.get("soldBy")) filter.soldBy = q.get("soldBy");
    Object.assign(filter, PAYMENT[q.get("paymentStatus")] || {});

    const from = q.get("from");
    const to = q.get("to");
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00+06:00`);
      if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999+06:00`);
    }

    const search = q.get("search")?.trim();
    if (search) {
      const regex = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ orderNumber: regex }, { customerName: regex }, { phone: regex }, { remark: regex }, { "items.imeis": regex }, { "items.productName": regex }];
    }

    const page = Math.max(1, Number(q.get("page")) || 1);
    const limit = Math.min(500, Math.max(1, Number(q.get("limit")) || 20));

    const [orders, total, sums] = await Promise.all([
      POSOrder.find(filter)
        .select("orderNumber createdAt customerId customerName customerType phone soldBy items.qty total paidAmount dueAmount remark orderType exchange.returnedTotal showroomId")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      POSOrder.countDocuments(filter),
      POSOrder.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
            paid: { $sum: "$paidAmount" },
            due: { $sum: "$dueAmount" },
            items: { $sum: { $sum: "$items.qty" } },
          },
        },
      ]),
    ]);

    // returns already made against these invoices
    const returned = new Map(
      (
        await SaleReturn.aggregate([
          { $match: { deletedAt: null, saleId: { $in: orders.map((o) => o._id) } } },
          { $group: { _id: "$saleId", total: { $sum: "$total" } } },
        ])
      ).map((r) => [String(r._id), r.total]),
    );

    return NextResponse.json({
      success: true,
      data: orders.map((o) => ({
        ...o,
        items: undefined,
        itemCount: (o.items || []).reduce((sum, i) => sum + (i.qty || 0), 0),
        paymentStatus: paymentStatus(o.paidAmount, o.dueAmount),
        returned: returned.get(String(o._id)) || 0,
      })),
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      from: total ? (page - 1) * limit + 1 : 0,
      hasMore: page * limit < total,
      summary: sums[0] || { total: 0, paid: 0, due: 0, items: 0 },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

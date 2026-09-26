import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

import InventoryTransaction from "@/models/InventoryTransaction.model";
import POSOrder from "@/models/posorder.model";
import ProductModel from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import ShowroomStock from "@/models/ShowroomStock";
import WarehouseStock from "@/models/WarehouseStock.model";
import Showroom from "@/models/Showroom.model";

const TYPE_LABELS = {
  OPENING: "Opening Stock",
  IN: "Purchase / Stock In",
  OUT: "Stock Out",
  SALE: "Sale",
  RETURN: "Sale Return",
  ADJUSTMENT: "Adjustment",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
  DAMAGE: "Damage",
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const dayStart = (v) => (v ? new Date(`${v}T00:00:00+06:00`) : null);
const dayEnd = (v) => (v ? new Date(`${v}T23:59:59.999+06:00`) : null);

/**
 * GET ?productId&from&to&search — the Stock Ledger of one product, like
 * 360's: every movement in date order with in, out, running stock, rate,
 * value and the profit on each sale.
 *
 * Stock history (opening, purchases, adjustments, returns) comes from the
 * stock log; sales and exchanges come from the invoices themselves, since a
 * POS sale does not write to the log. Where older stock has no record at
 * all, a "Stock before records" line makes the running total end at the
 * stock actually on hand.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.history");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    if (!mongoose.isValidObjectId(productId)) {
      return NextResponse.json({ success: false, message: "Select a product" }, { status: 400 });
    }

    const product = await ProductModel.findById(productId).select("name unit").lean();
    if (!product) return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });

    const pid = new mongoose.Types.ObjectId(productId);
    const [variants, showrooms, logs, orders, shopStock, warehouseStock] = await Promise.all([
      ProductVariant.find({ product: pid }).select("color size barcode purchasePrice sellingPrice").lean(),
      Showroom.find().select("name").lean(),
      InventoryTransaction.find({ productId: pid }).sort({ createdAt: 1, _id: 1 }).lean(),
      POSOrder.find({
        status: "completed",
        $or: [
          { "items.productId": pid },
          { "exchange.returnedItems.productId": pid },
          { "exchange.newItems.productId": pid },
        ],
      })
        .select("orderNumber showroomId saleDate createdAt orderType items exchange")
        .lean(),
      ShowroomStock.aggregate([{ $match: { productId: pid } }, { $group: { _id: null, stock: { $sum: "$stock" } } }]),
      WarehouseStock.aggregate([{ $match: { productId: pid } }, { $group: { _id: null, stock: { $sum: "$stock" } } }]),
    ]);

    const variantMap = new Map(variants.map((v) => [String(v._id), v]));
    const showroomName = new Map(showrooms.map((s) => [String(s._id), s.name]));
    const branchOf = (id) => (id ? showroomName.get(String(id)) || "Branch" : "Warehouse");
    const variantText = (id) => {
      const v = variantMap.get(String(id));
      return v ? [v.barcode, [v.color, v.size].filter(Boolean).join(" / ")].filter(Boolean).join(" · ") : "";
    };

    const rows = [];

    // the stock log: every change the app records, except POS sales
    for (const log of logs) {
      const change = (Number(log.newStock) || 0) - (Number(log.previousStock) || 0);
      if (!change) continue;
      const v = variantMap.get(String(log.variantId));
      const rate = Number(v?.purchasePrice) || 0;
      rows.push({
        date: log.createdAt,
        branch: branchOf(log.showroomId),
        details: [variantText(log.variantId), log.note].filter(Boolean).join(" | "),
        invoiceNo: String(log.note || "").match(/\b[A-Z]{2,4}-\d+\b/)?.[0] || "",
        type: TYPE_LABELS[log.type] || log.type,
        change,
        rate,
        profit: 0,
      });
    }

    // sales and exchanges, from the invoices
    for (const order of orders) {
      const date = order.saleDate || order.createdAt;
      const branch = branchOf(order.showroomId);
      const lines = (list, type, sign) => {
        for (const item of list || []) {
          if (String(item.productId) !== productId) continue;
          const qty = Number(item.qty) || 0;
          if (!qty) continue;
          const v = variantMap.get(String(item.variantId));
          const price = Number(item.price) || Number(v?.sellingPrice) || 0;
          const cost = Number(item.purchasePrice) || Number(v?.purchasePrice) || 0;
          rows.push({
            date,
            branch,
            details: variantText(item.variantId),
            invoiceNo: order.orderNumber,
            type,
            change: sign * qty,
            rate: price,
            profit: sign < 0 && type === "Sale" ? round2(qty * (price - cost)) : 0,
          });
        }
      };

      if (order.orderType === "exchange" || order.exchange?.isExchange) {
        lines(order.exchange?.returnedItems, "Exchange In", 1);
        lines(order.exchange?.newItems, "Exchange Out", -1);
      } else {
        lines(order.items, "Sale", -1);
      }
    }

    rows.sort((a, b) => new Date(a.date) - new Date(b.date));

    // stock that was already there before anything was recorded
    const onHand = (Number(shopStock[0]?.stock) || 0) + (Number(warehouseStock[0]?.stock) || 0);
    const recorded = rows.reduce((sum, r) => sum + r.change, 0);
    const before = round2(onHand - recorded);
    if (before !== 0) {
      rows.unshift({
        date: rows[0]?.date || new Date(),
        branch: "—",
        details: "Stock on hand before the app recorded its movements",
        invoiceNo: "",
        type: "Stock before records",
        change: before,
        rate: Number(variants[0]?.purchasePrice) || 0,
        profit: 0,
        isBalance: true,
      });
    }

    // running stock over everything, then the date range and search
    let running = 0;
    const from = dayStart(searchParams.get("from"));
    const to = dayEnd(searchParams.get("to"));
    const needle = String(searchParams.get("search") || "").trim().toLowerCase();
    let openingForRange = 0;

    const list = [];
    for (const r of rows) {
      running = round2(running + r.change);
      const when = new Date(r.date);
      if (from && when < from) {
        openingForRange = running;
        continue;
      }
      if (to && when > to) continue;
      const row = {
        date: r.date,
        branch: r.branch,
        details: r.details,
        invoiceNo: r.invoiceNo,
        type: r.type,
        inQty: r.change > 0 ? round2(r.change) : 0,
        outQty: r.change < 0 ? round2(-r.change) : 0,
        stock: running,
        rate: round2(r.rate),
        total: round2(Math.abs(r.change) * r.rate),
        profit: r.profit,
        isBalance: !!r.isBalance,
      };
      if (needle && !`${row.details} ${row.invoiceNo} ${row.type} ${row.branch}`.toLowerCase().includes(needle)) continue;
      list.push(row);
    }

    return NextResponse.json({
      success: true,
      product: { _id: productId, name: product.name, unit: product.unit || "Pcs" },
      openingForRange: from ? openingForRange : null,
      rows: list,
      summary: {
        inQty: round2(list.reduce((s, r) => s + r.inQty, 0)),
        outQty: round2(list.reduce((s, r) => s + r.outQty, 0)),
        stock: list.length ? list[list.length - 1].stock : round2(onHand),
        onHand: round2(onHand),
        total: round2(list.reduce((s, r) => s + r.total, 0)),
        profit: round2(list.reduce((s, r) => s + r.profit, 0)),
      },
    });
  } catch (error) {
    console.error("STOCK LEDGER ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the stock ledger" }, { status: 500 });
  }
}

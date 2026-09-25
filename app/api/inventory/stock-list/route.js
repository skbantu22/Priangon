import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { WAREHOUSE_KEY, parseLocation } from "@/lib/stockService";

import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import StockAdjustment from "@/models/StockAdjustment.model";
import Purchase from "@/models/Purchase.model";
import Product from "@/models/Product.model";
import Category from "@/models/category.model";

import "@/models/ProductVariant.model ";
import "@/models/Showroom.model";
import "@/models/Media.model";

const LOW_STOCK_AT = 5;

// Movements that bring units into a location. ADJUSTMENT is counted only
// when it raised the figure, which the aggregation checks separately.
const IN_TYPES = ["OPENING", "IN", "RETURN", "TRANSFER_IN"];

const SORTS = {
  "name-asc": (a, b) => a.productName.localeCompare(b.productName),
  "name-desc": (a, b) => b.productName.localeCompare(a.productName),
  "stock-desc": (a, b) => b.stock - a.stock,
  "stock-asc": (a, b) => a.stock - b.stock,
  "value-desc": (a, b) => b.stockPP - a.stockPP,
};

/**
 * The stock report: one row per product per location.
 *
 * Variants are added up under their product, so a product in three sizes
 * reads as one line. In and Expire come from the movement history; Out is
 * whatever the history cannot account for, because sales take stock down
 * without leaving a movement behind. That keeps every row adding up:
 * In − Out − Expire = Stock.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();
    const brand = (searchParams.get("brand") || "").trim();
    const category = (searchParams.get("category") || "").trim();
    const stockFilter = searchParams.get("stock") || "all"; // all | in | low | out
    const sort = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "name-asc";
    const exportAll = searchParams.get("all") === "1";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(200, Math.max(10, Number(searchParams.get("limit")) || 10));

    let location = searchParams.get("location") || "all";

    // A login tied to one showroom only ever reads that showroom
    if (auth.showroomId && auth.role !== "admin" && auth.role !== "manager") {
      location = String(auth.showroomId);
    }

    const parsed = location === "all" ? null : parseLocation(location);

    if (location !== "all" && !parsed) {
      return NextResponse.json(
        { success: false, message: "Unknown location" },
        { status: 400 },
      );
    }

    const productMatch = {
      deletedAt: null,
      ...(brand && { brand }),
      ...(mongoose.isValidObjectId(category) && { category }),
    };

    const productPopulate = {
      path: "productId",
      match: productMatch,
      select: "name brand unit category media sellingPrice purchasePrice alertQuantity",
      populate: [
        { path: "media", select: "secure_url" },
        { path: "category", select: "name" },
      ],
    };

    const variantPopulate = {
      path: "variantId",
      select: "color size sku barcode priceSource sellingPrice purchasePrice deletedAt",
    };

    // ---------- current stock, per variant per location ----------
    const stockRows = [];

    const wantsWarehouse = location === "all" || location === WAREHOUSE_KEY;
    const wantsShowrooms = location === "all" || location !== WAREHOUSE_KEY;

    if (wantsWarehouse) {
      const warehouse = await WarehouseStock.find({})
        .populate(productPopulate)
        .populate(variantPopulate)
        .lean();

      for (const row of warehouse) {
        if (!row.productId || !row.variantId) continue;

        stockRows.push({ ...row, locationKey: WAREHOUSE_KEY, locationName: "Warehouse" });
      }
    }

    if (wantsShowrooms) {
      const showroom = await ShowroomStock.find(
        parsed?.locationId ? { showroomId: parsed.locationId } : {},
      )
        .populate({ path: "showroomId", select: "name" })
        .populate(productPopulate)
        .populate(variantPopulate)
        .lean();

      for (const row of showroom) {
        if (!row.productId || !row.variantId || !row.showroomId) continue;

        stockRows.push({
          ...row,
          locationKey: String(row.showroomId._id),
          locationName: row.showroomId.name,
        });
      }
    }

    // ---------- movement totals, per variant per location ----------
    const variantIds = [...new Set(stockRows.map((row) => String(row.variantId._id)))].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const [inTotals, expiredTotals, lastPrices] = await Promise.all([
      InventoryTransaction.aggregate([
        { $match: { variantId: { $in: variantIds } } },
        {
          $group: {
            _id: { showroomId: "$showroomId", variantId: "$variantId" },
            quantity: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $in: ["$type", IN_TYPES] },
                      {
                        $and: [
                          { $eq: ["$type", "ADJUSTMENT"] },
                          { $gt: ["$newStock", "$previousStock"] },
                        ],
                      },
                    ],
                  },
                  "$quantity",
                  0,
                ],
              },
            },
          },
        },
      ]),

      StockAdjustment.aggregate([
        { $match: { deletedAt: null, reason: "expired" } },
        { $unwind: "$items" },
        { $match: { "items.type": "subtract", "items.variantId": { $in: variantIds } } },
        {
          $group: {
            _id: { showroomId: "$locationId", variantId: "$items.variantId" },
            quantity: { $sum: "$items.quantity" },
          },
        },
      ]),

      // The price paid on the most recent received purchase
      Purchase.aggregate([
        { $match: { deletedAt: null, status: "received" } },
        { $unwind: "$items" },
        { $sort: { purchaseDate: -1, createdAt: -1 } },
        { $group: { _id: "$items.productId", unitPrice: { $first: "$items.unitPrice" } } },
      ]),
    ]);

    const movementKey = (showroomId, variantId) =>
      `${showroomId ? String(showroomId) : WAREHOUSE_KEY}:${String(variantId)}`;

    const inByKey = new Map(
      inTotals.map((row) => [movementKey(row._id.showroomId, row._id.variantId), row.quantity]),
    );
    const expiredByKey = new Map(
      expiredTotals.map((row) => [movementKey(row._id.showroomId, row._id.variantId), row.quantity]),
    );
    const lastPriceByProduct = new Map(
      lastPrices.map((row) => [String(row._id), Number(row.unitPrice) || 0]),
    );

    // ---------- one row per product per location ----------
    const grouped = new Map();

    for (const row of stockRows) {
      const product = row.productId;
      const variant = row.variantId;
      const key = `${row.locationKey}:${String(product._id)}`;

      let line = grouped.get(key);

      if (!line) {
        line = {
          _id: key,
          productId: String(product._id),
          productName: product.name || "",
          brand: product.brand || "",
          category: product.category?.name || "Uncategorised",
          unit: product.unit || "Pcs",
          image: product.media?.[0]?.secure_url || null,
          locationKey: row.locationKey,
          locationName: row.locationName,
          alertQuantity: Number(product.alertQuantity) || 0,
          lastPurchasePrice: lastPriceByProduct.get(String(product._id)) || 0,
          productSellingPrice: Number(product.sellingPrice) || 0,
          productPurchasePrice: Number(product.purchasePrice) || 0,
          inQuantity: 0,
          outQuantity: 0,
          expireQuantity: 0,
          stock: 0,
          stockPP: 0,
          stockSP: 0,
          costSum: 0,
          priceSum: 0,
          variants: [],
          search: [],
        };

        grouped.set(key, line);
      }

      const stock = Number(row.stock) || 0;
      const mKey = movementKey(
        row.locationKey === WAREHOUSE_KEY ? null : row.locationKey,
        variant._id,
      );

      const expired = expiredByKey.get(mKey) || 0;

      // Stock set before movements were recorded has no IN behind it;
      // count it as having come in, so Out never goes negative
      const inQuantity = Math.max(inByKey.get(mKey) || 0, stock + expired);
      const outQuantity = inQuantity - expired - stock;

      const cost = Number(variant.purchasePrice) || line.productPurchasePrice;
      const price =
        variant.priceSource === "CUSTOM" && Number(variant.sellingPrice) > 0
          ? Number(variant.sellingPrice)
          : line.productSellingPrice || Number(variant.sellingPrice) || 0;

      line.inQuantity += inQuantity;
      line.outQuantity += outQuantity;
      line.expireQuantity += expired;
      line.stock += stock;
      line.stockPP += stock * cost;
      line.stockSP += stock * price;
      line.costSum += cost;
      line.priceSum += price;

      line.variants.push({
        variantId: String(variant._id),
        label: [variant.color, variant.size].filter(Boolean).join(" / ") || "Default",
        sku: variant.sku || "",
        barcode: variant.barcode || "",
        purchasePrice: cost,
        sellingPrice: price,
        inQuantity,
        outQuantity,
        expireQuantity: expired,
        stock,
      });

      line.search.push(variant.sku || "", variant.barcode || "");
    }

    const needle = q.toLowerCase();

    const lines = [...grouped.values()]
      .map((line) => {
        const count = line.variants.length || 1;

        // Average cost of what is on hand; with nothing on hand, the
        // plain average of the variants' costs
        const avgPurchasePrice =
          line.stock > 0 ? line.stockPP / line.stock : line.costSum / count;
        const sellingPrice =
          line.stock > 0 ? line.stockSP / line.stock : line.priceSum / count;

        const lowAt = line.alertQuantity || LOW_STOCK_AT;

        return {
          _id: line._id,
          productId: line.productId,
          productName: line.productName,
          brand: line.brand,
          category: line.category,
          unit: line.unit,
          image: line.image,
          locationKey: line.locationKey,
          locationName: line.locationName,
          avgPurchasePrice: round(avgPurchasePrice),
          lastPurchasePrice: round(line.lastPurchasePrice),
          sellingPrice: round(sellingPrice),
          inQuantity: round(line.inQuantity),
          outQuantity: round(line.outQuantity),
          expireQuantity: round(line.expireQuantity),
          stock: round(line.stock),
          stockPP: round(line.stockPP),
          stockSP: round(line.stockSP),
          lowAt,
          variants: line.variants.sort((a, b) => a.label.localeCompare(b.label)),
          search: line.search,
        };
      })
      .filter((line) => {
        if (stockFilter === "in" && line.stock <= 0) return false;
        if (stockFilter === "out" && line.stock > 0) return false;
        if (stockFilter === "low" && (line.stock <= 0 || line.stock > line.lowAt)) {
          return false;
        }

        // A scanned barcode or a SKU finds its product too
        if (
          needle &&
          !line.productName.toLowerCase().includes(needle) &&
          !line.search.some((value) => value.toLowerCase().includes(needle))
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          SORTS[sort](a, b) ||
          a.productName.localeCompare(b.productName) ||
          a.locationName.localeCompare(b.locationName),
      );

    for (const line of lines) delete line.search;

    const totals = lines.reduce(
      (sum, line) => ({
        inQuantity: sum.inQuantity + line.inQuantity,
        outQuantity: sum.outQuantity + line.outQuantity,
        expireQuantity: sum.expireQuantity + line.expireQuantity,
        stock: sum.stock + line.stock,
        stockPP: sum.stockPP + line.stockPP,
        stockSP: sum.stockSP + line.stockSP,
      }),
      { inQuantity: 0, outQuantity: 0, expireQuantity: 0, stock: 0, stockPP: 0, stockSP: 0 },
    );

    for (const field of Object.keys(totals)) totals[field] = round(totals[field]);

    const [brands, categories] = await Promise.all([
      Product.distinct("brand", { deletedAt: null, brand: { $nin: ["", null] } }),
      Category.find({ deletedAt: null }).select("name").sort({ name: 1 }).lean(),
    ]);

    const start = exportAll ? 0 : (page - 1) * limit;
    const data = exportAll ? lines : lines.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      data,
      totals,
      page: exportAll ? 1 : page,
      limit,
      total: lines.length,
      pages: exportAll ? 1 : Math.max(1, Math.ceil(lines.length / limit)),
      filters: {
        brands: brands.sort((a, b) => a.localeCompare(b)),
        categories: categories.map((item) => ({ id: String(item._id), name: item.name })),
      },
    });
  } catch (error) {
    console.error("STOCK LIST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load stock" },
      { status: 500 },
    );
  }
}

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import POSOrder from "@/models/posorder.model";
import ShowroomStock from "@/models/ShowroomStock";
import WarrantyClaim from "@/models/WarrantyClaim.model";
import PartnerOrder from "@/models/PartnerOrder.model";

const TZ = "Asia/Dhaka";
const TZ_OFFSET_MS = 6 * 60 * 60 * 1000; // Dhaka is UTC+6, no DST
const LOW_STOCK = 5;
const DAY = 24 * 60 * 60 * 1000;

// midnight (Dhaka time) of the day containing `date`, as a UTC Date
const dhakaDayStart = (date = new Date()) => {
  const local = new Date(date.getTime() + TZ_OFFSET_MS);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      TZ_OFFSET_MS,
  );
};
const dhakaMonthStart = (year, month) =>
  new Date(Date.UTC(year, month, 1) - TZ_OFFSET_MS);

const parseDay = (value, fallback) => {
  const d = value ? new Date(`${value}T00:00:00+06:00`) : null;
  return d && !isNaN(d) ? d : fallback;
};

const sumOf = (field) => ({ $sum: { $ifNull: [field, 0] } });

export async function GET(req) {
  const auth = await isAuthenticated();
  if (!auth.isAuth || !["admin", "manager"].includes(auth.role)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 403 },
    );
  }

  try {
    await connectDB();

    const sp = new URL(req.url).searchParams;
    const showroomId = sp.get("showroomId");
    const chart = ["daily", "monthly", "yearly"].includes(sp.get("chart"))
      ? sp.get("chart")
      : "daily";
    const limit = Math.min(50, Math.max(5, Number(sp.get("limit")) || 10));

    const now = new Date();
    const today = dhakaDayStart(now);
    const tomorrow = new Date(today.getTime() + DAY);
    const localNow = new Date(now.getTime() + TZ_OFFSET_MS);
    const thisMonth = dhakaMonthStart(
      localNow.getUTCFullYear(),
      localNow.getUTCMonth(),
    );

    // period for the ranking widgets (default: last 30 days incl. today)
    const from = parseDay(sp.get("from"), new Date(today.getTime() - 29 * DAY));
    const to = new Date(parseDay(sp.get("to"), today).getTime() + DAY);

    // chart window
    const [py, pm] = (sp.get("period") || "").split("-").map(Number);
    const year = py || localNow.getUTCFullYear();
    const month = pm ? pm - 1 : localNow.getUTCMonth();
    let chartFrom, chartTo, chartFormat;
    if (chart === "daily") {
      chartFrom = dhakaMonthStart(year, month);
      chartTo = dhakaMonthStart(year, month + 1);
      chartFormat = "%Y-%m-%d";
    } else if (chart === "monthly") {
      chartFrom = dhakaMonthStart(year, 0);
      chartTo = dhakaMonthStart(year + 1, 0);
      chartFormat = "%Y-%m";
    } else {
      chartFrom = dhakaMonthStart(year - 4, 0);
      chartTo = dhakaMonthStart(year + 1, 0);
      chartFormat = "%Y";
    }

    const showroom =
      showroomId && mongoose.isValidObjectId(showroomId)
        ? new mongoose.Types.ObjectId(showroomId)
        : null;
    const base = { status: "completed", ...(showroom && { showroomId: showroom }) };
    const saleDate = { $ifNull: ["$saleDate", "$createdAt"] };
    const between = (a, b) => ({
      ...base,
      $expr: { $and: [{ $gte: [saleDate, a] }, { $lt: [saleDate, b] }] },
    });

    const itemsWithProduct = [
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "product",
          pipeline: [{ $project: { name: 1, brand: 1, category: 1 } }],
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ];

    const orderAgg = POSOrder.aggregate([
      {
        $facet: {
          today: [
            { $match: between(today, tomorrow) },
            {
              $group: {
                _id: null,
                sales: sumOf("$total"),
                orders: { $sum: 1 },
                received: { $sum: { $ifNull: ["$paidAmount", "$total"] } },
                dueAdded: sumOf("$dueAmount"),
                units: { $sum: { $sum: "$items.qty" } },
                serialUnits: {
                  $sum: {
                    $sum: {
                      $map: {
                        input: "$items",
                        in: { $size: { $ifNull: ["$$this.imeis", []] } },
                      },
                    },
                  },
                },
              },
            },
          ],
          month: [
            { $match: between(thisMonth, tomorrow) },
            { $group: { _id: null, sales: sumOf("$total"), orders: { $sum: 1 } } },
          ],
          due: [
            { $match: { ...base, dueAmount: { $gt: 0 } } },
            {
              $group: {
                _id: { $ifNull: ["$customerId", "$phone"] },
                name: { $last: "$customerName" },
                phone: { $last: "$phone" },
                due: { $sum: "$dueAmount" },
                orders: { $sum: 1 },
              },
            },
            { $sort: { due: -1 } },
          ],
          chart: [
            { $match: between(chartFrom, chartTo) },
            {
              $group: {
                _id: { $dateToString: { format: chartFormat, date: saleDate, timezone: TZ } },
                sales: sumOf("$total"),
                orders: { $sum: 1 },
              },
            },
          ],
          payments: [
            { $match: between(today, tomorrow) },
            { $unwind: "$payments" },
            {
              $group: {
                _id: { type: "$payments.type", option: "$payments.option" },
                amount: sumOf("$payments.amount"),
                count: { $sum: 1 },
              },
            },
            { $sort: { amount: -1 } },
          ],
          categories: [
            { $match: between(from, to) },
            ...itemsWithProduct,
            {
              $group: {
                _id: "$product.category",
                revenue: sumOf("$items.subtotal"),
                qty: sumOf("$items.qty"),
              },
            },
            {
              $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "cat",
                pipeline: [{ $project: { name: 1 } }],
              },
            },
            { $sort: { revenue: -1 } },
          ],
          brands: [
            { $match: between(from, to) },
            ...itemsWithProduct,
            {
              $group: {
                _id: { $ifNull: ["$product.brand", "Other"] },
                revenue: sumOf("$items.subtotal"),
                qty: sumOf("$items.qty"),
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: 8 },
          ],
          products: [
            { $match: between(from, to) },
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.productId",
                name: { $first: "$items.productName" },
                image: { $first: "$items.image" },
                qty: sumOf("$items.qty"),
                revenue: sumOf("$items.subtotal"),
              },
            },
            { $sort: { revenue: -1 } },
            { $limit: limit },
          ],
          customers: [
            { $match: { ...between(from, to), phone: { $nin: [null, ""] } } },
            {
              $group: {
                _id: "$phone",
                name: { $last: "$customerName" },
                orders: { $sum: 1 },
                spent: sumOf("$total"),
                due: sumOf("$dueAmount"),
              },
            },
            { $sort: { spent: -1 } },
            { $limit: limit },
          ],
          expiring: [
            { $match: base },
            { $unwind: "$items" },
            {
              $match: {
                "items.warrantyExpiry": {
                  $gte: now,
                  $lt: new Date(now.getTime() + 30 * DAY),
                },
              },
            },
            { $sort: { "items.warrantyExpiry": 1 } },
            {
              $project: {
                _id: 0,
                orderNumber: 1,
                customerName: 1,
                phone: 1,
                productName: "$items.productName",
                imei: { $arrayElemAt: ["$items.imeis", 0] },
                expiry: "$items.warrantyExpiry",
              },
            },
            { $limit: 20 },
          ],
        },
      },
    ]);

    // ---- stock (value, low stock) ----
    const stockMatch = showroom ? { showroomId: showroom } : {};
    const stockAgg = ShowroomStock.aggregate([
      { $match: stockMatch },
      { $group: { _id: "$variantId", productId: { $first: "$productId" }, stock: { $sum: "$stock" } } },
      {
        $lookup: {
          from: "productvariants",
          localField: "_id",
          foreignField: "_id",
          as: "variant",
          pipeline: [{ $project: { sellingPrice: 1, color: 1, size: 1, media: 1, deletedAt: 1 } }],
        },
      },
      { $unwind: "$variant" },
      { $match: { "variant.deletedAt": null } },
      {
        $facet: {
          value: [
            {
              $group: {
                _id: null,
                value: { $sum: { $multiply: ["$stock", "$variant.sellingPrice"] } },
                units: { $sum: "$stock" },
              },
            },
          ],
          low: [
            { $match: { stock: { $lte: LOW_STOCK } } },
            { $sort: { stock: 1 } },
            {
              $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product",
                pipeline: [{ $project: { name: 1 } }],
              },
            },
            {
              $project: {
                stock: 1,
                name: { $arrayElemAt: ["$product.name", 0] },
                variant: { $concat: [{ $ifNull: ["$variant.size", ""] }, " · ", { $ifNull: ["$variant.color", ""] }] },
                image: { $arrayElemAt: ["$variant.media", 0] },
              },
            },
          ],
        },
      },
    ]);

    // ---- warranty claims ----
    const claimMatch = showroom ? { showroomId: showroom } : {};
    const claimAgg = WarrantyClaim.aggregate([
      { $match: claimMatch },
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]);
    // the three reads are independent: run them together (one DB round trip instead of three)
    const [[orderFacets], [stockFacets], claimCounts] = await Promise.all([
      orderAgg,
      stockAgg,
      claimAgg,
    ]);
    const claims = Object.fromEntries(claimCounts.map((c) => [c._id, c.n]));

    // ---- shape the response ----
    const t = orderFacets.today[0] || {};
    const catList = orderFacets.categories.map((c) => ({
      name: c.cat?.[0]?.name || "Uncategorized",
      revenue: c.revenue,
      qty: c.qty,
    }));
    const topCats = catList.slice(0, 4);
    const otherRevenue = catList.slice(4).reduce((s, c) => s + c.revenue, 0);
    if (otherRevenue > 0) topCats.push({ name: "Other", revenue: otherRevenue });

    // every bucket of the chart window, zero-filled
    const chartMap = new Map(orderFacets.chart.map((c) => [c._id, c]));
    const buckets = [];
    if (chart === "daily") {
      const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let d = 1; d <= days; d++) {
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        buckets.push({ key, label: String(d) });
      }
    } else if (chart === "monthly") {
      for (let m = 0; m < 12; m++) {
        const key = `${year}-${String(m + 1).padStart(2, "0")}`;
        buckets.push({
          key,
          label: new Date(Date.UTC(year, m, 1)).toLocaleString("en", { month: "short", timeZone: "UTC" }),
        });
      }
    } else {
      for (let y = year - 4; y <= year; y++) buckets.push({ key: String(y), label: String(y) });
    }
    const salesChart = buckets.map((b) => ({
      label: b.label,
      key: b.key,
      sales: chartMap.get(b.key)?.sales || 0,
      orders: chartMap.get(b.key)?.orders || 0,
    }));

    const dues = orderFacets.due;
    const sv = stockFacets?.value?.[0] || {};

    return NextResponse.json({
      success: true,
      kpis: {
        todaySales: t.sales || 0,
        todayOrders: t.orders || 0,
        todayReceived: t.received || 0,
        todayDueAdded: t.dueAdded || 0,
        todayUnits: t.units || 0,
        todayPhones: t.serialUnits || 0,
        monthSales: orderFacets.month[0]?.sales || 0,
        monthOrders: orderFacets.month[0]?.orders || 0,
        customersDue: dues.reduce((s, d) => s + d.due, 0),
        dueCustomers: dues.length,
        stockValue: sv.value || 0,
        stockUnits: sv.units || 0,
        lowStockCount: stockFacets?.low?.length || 0,
        openClaims: (claims.received || 0) + (claims.sent_to_service || 0),
        readyClaims: (claims.repaired || 0) + (claims.replaced || 0),
        expiringSoon: orderFacets.expiring.length,
        pendingDealerOrders: await PartnerOrder.countDocuments({
          status: { $in: ["pending", "confirmed"] },
        }),
      },
      salesChart,
      chartTotal: salesChart.reduce((s, c) => s + c.sales, 0),
      topCategories: topCats,
      topBrands: orderFacets.brands.map((b) => ({ name: b._id || "Other", revenue: b.revenue, qty: b.qty })),
      topProducts: orderFacets.products,
      topCustomers: orderFacets.customers,
      payments: orderFacets.payments.map((p) => ({
        type: p._id.type,
        option: p._id.option || "",
        amount: p.amount,
        count: p.count,
      })),
      customerDues: dues.slice(0, 20),
      lowStock: (stockFacets?.low || []).slice(0, 20),
      expiring: orderFacets.expiring,
      claims,
      range: { from, to: new Date(to.getTime() - DAY) },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

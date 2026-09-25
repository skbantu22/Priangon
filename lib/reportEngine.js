import mongoose from "mongoose";

import POSOrder from "@/models/posorder.model";
import PartnerOrder from "@/models/PartnerOrder.model";
import CustomerModel from "@/models/Customer.model";
import CustomerPayment from "@/models/CustomerPayment.model";
import SupplierModel from "@/models/Supplier.model";
import SupplierPayment from "@/models/SupplierPayment.model";
import PurchaseModel from "@/models/Purchase.model";
import PurchaseReturn from "@/models/PurchaseReturn.model";
import PurchaseOrder from "@/models/PurchaseOrder.model";
import ExpenseModel from "@/models/Expense.model";
import ProductModel from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import { customerBalances } from "@/lib/customerService";
import { supplierBalances } from "@/lib/supplierService";
import { escapeRegex } from "@/lib/escapeRegex";

/**
 * The Reports menu, laid out like 360's report engine: every report is a
 * function that returns its columns and rows, and one page draws them all.
 *
 *   columns: [key, label, type]   type: text | money | rate | qty | date
 *   (a rate is a unit price: shown like money, never totalled)
 *
 * Money and quantity columns are totalled by the route. Dates are
 * Bangladesh days; a POS sale belongs to the day it was made (createdAt),
 * the same as the Profit & Loss report.
 */

const TZ = "+06:00";
const MAX_ROWS = 5000;

export const TYPE_LABEL = {
  retail: "Buyer / Retail",
  dealer: "Dealer",
  subDealer: "Sub Dealer",
  wholesaler: "Wholesaler",
};

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const dayString = (field) => ({ $dateToString: { format: "%Y-%m-%d", date: field, timezone: TZ } });

const variantText = (item) =>
  [item.color, item.size].filter((x) => x && !/^(default|standard)$/i.test(x)).join(" / ");

/** Date window on a field, from the yyyy-mm-dd strings the page sends */
function range(ctx, field) {
  if (!ctx.from && !ctx.to) return {};
  const window = {};
  if (ctx.from) window.$gte = new Date(`${ctx.from}T00:00:00${TZ}`);
  if (ctx.to) window.$lte = new Date(`${ctx.to}T23:59:59.999${TZ}`);
  return { [field]: window };
}

/** $or of case-insensitive matches for the search box, or nothing */
function searchOn(ctx, fields) {
  if (!ctx.search) return {};
  const regex = { $regex: escapeRegex(ctx.search), $options: "i" };
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

// ------------------------------------------------------------------ sales

const saleMatch = (ctx, extra = {}) => ({
  status: "completed",
  ...range(ctx, "createdAt"),
  ...(ctx.showroomId && { showroomId: new mongoose.Types.ObjectId(ctx.showroomId) }),
  ...searchOn(ctx, ["orderNumber", "customerName", "phone", "soldBy"]),
  ...extra,
});

const SALE_COLUMNS = [
  ["date", "Date", "date"],
  ["invoice", "Invoice No", "text"],
  ["customer", "Customer", "text"],
  ["type", "Customer Type", "text"],
  ["soldBy", "Sold By", "text"],
  ["qty", "Qty", "qty"],
  ["subtotal", "Subtotal", "money"],
  ["discount", "Discount", "money"],
  ["vat", "VAT", "money"],
  ["total", "Total", "money"],
  ["paid", "Paid", "money"],
  ["due", "Due", "money"],
];

async function saleRows(ctx, extra) {
  const orders = await POSOrder.find(saleMatch(ctx, extra))
    .select("createdAt orderNumber customerName customerType soldBy items.qty subTotal discount vat total paidAmount dueAmount")
    .sort({ createdAt: -1 })
    .limit(MAX_ROWS)
    .lean();

  return orders.map((o) => ({
    date: o.createdAt,
    invoice: o.orderNumber,
    customer: o.customerName,
    type: TYPE_LABEL[o.customerType] || TYPE_LABEL.retail,
    soldBy: o.soldBy || "",
    qty: (o.items || []).reduce((sum, item) => sum + (item.qty || 0), 0),
    subtotal: o.subTotal,
    discount: o.discount,
    vat: o.vat,
    total: o.total,
    paid: o.paidAmount,
    due: o.dueAmount,
  }));
}

/** Sales added up per group: invoices, qty, discount, VAT, total, received, due */
async function groupedSales(ctx, groupKey, label, extra = {}) {
  const rows = await POSOrder.aggregate([
    { $match: saleMatch(ctx, extra) },
    {
      $group: {
        _id: groupKey,
        invoices: { $sum: 1 },
        qty: { $sum: { $sum: "$items.qty" } },
        discount: { $sum: "$discount" },
        vat: { $sum: "$vat" },
        total: { $sum: "$total" },
        paid: { $sum: "$paidAmount" },
        due: { $sum: "$dueAmount" },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  return {
    columns: [
      ["period", label, "text"],
      ["invoices", "Invoices", "qty"],
      ["qty", "Qty", "qty"],
      ["discount", "Discount", "money"],
      ["vat", "VAT", "money"],
      ["total", "Total Sale", "money"],
      ["paid", "Received", "money"],
      ["due", "Due", "money"],
    ],
    rows: rows.map((r) => ({ period: r._id ?? "—", ...r })),
  };
}

/** One row per sold line, with what it cost (items[].purchasePrice is kept at the sale) */
async function soldLines(ctx) {
  const rows = await POSOrder.aggregate([
    { $match: saleMatch(ctx) },
    { $unwind: "$items" },
    ...(ctx.search
      ? [{ $match: { $or: [{ orderNumber: { $regex: escapeRegex(ctx.search), $options: "i" } }, { "items.productName": { $regex: escapeRegex(ctx.search), $options: "i" } }] } }]
      : []),
    { $sort: { createdAt: -1 } },
    { $limit: MAX_ROWS * 4 },
    {
      $project: {
        createdAt: 1,
        orderNumber: 1,
        customerName: 1,
        customerType: 1,
        item: "$items",
      },
    },
  ]);
  return rows;
}

// ------------------------------------------------------------- contacts

async function customerRows(ctx, { type, dueOnly }) {
  const customers = await CustomerModel.find({
    ...(type && { type }),
    ...searchOn(ctx, ["name", "phone", "businessName"]),
  })
    .select("name businessName phone address type openingDue initialAdvance")
    .sort({ name: 1 })
    .limit(MAX_ROWS)
    .lean();

  const balances = await customerBalances(customers);

  const rows = customers.map((c) => {
    const b = balances.get(String(c._id)) || {};
    return {
      name: c.businessName ? `${c.name} (${c.businessName})` : c.name,
      mobile: c.phone,
      address: c.address || "",
      type: TYPE_LABEL[c.type] || TYPE_LABEL.retail,
      invoices: b.saleCount || 0,
      total: b.total,
      paid: b.paid,
      dismiss: b.dismiss,
      advance: b.advance,
      due: b.due,
    };
  });

  return {
    columns: [
      ["name", "Name", "text"],
      ["mobile", "Mobile", "text"],
      ["address", "Address", "text"],
      ...(type ? [] : [["type", "Type", "text"]]),
      ["invoices", "Invoices", "qty"],
      ["total", "Sales", "money"],
      ["paid", "Paid", "money"],
      ["dismiss", "Dismiss", "money"],
      ["advance", "Advance", "money"],
      ["due", "Due", "money"],
    ],
    rows: dueOnly ? rows.filter((r) => r.due > 0.009) : rows,
  };
}

async function supplierRows(ctx, dueOnly) {
  const suppliers = await SupplierModel.find({ deletedAt: null, ...searchOn(ctx, ["name", "phone", "companyName"]) })
    .select("name companyName phone address openingBalance initialAdvance")
    .sort({ name: 1 })
    .limit(MAX_ROWS)
    .lean();

  const balances = await supplierBalances(suppliers);

  const rows = suppliers.map((s) => {
    const b = balances.get(String(s._id)) || {};
    return {
      name: s.companyName ? `${s.name} (${s.companyName})` : s.name,
      mobile: s.phone,
      address: s.address || "",
      total: b.total,
      paid: b.paid,
      returned: b.returned,
      dismiss: b.dismiss,
      advance: b.advance,
      due: b.due,
    };
  });

  return {
    columns: [
      ["name", "Name", "text"],
      ["mobile", "Mobile", "text"],
      ["address", "Address", "text"],
      ["total", "Purchases", "money"],
      ["paid", "Paid", "money"],
      ["returned", "Returned", "money"],
      ["dismiss", "Dismiss", "money"],
      ["advance", "Advance", "money"],
      ["due", "Due", "money"],
    ],
    rows: dueOnly ? rows.filter((r) => r.due > 0.009) : rows,
  };
}

// --------------------------------------------------------------- figures

/** Profit/Loss and Summary share these totals for the period */
async function figures(ctx) {
  const sum = async (Model, match, expr) =>
    (await Model.aggregate([{ $match: match }, { $group: { _id: null, v: { $sum: expr } } }]))[0]?.v || 0;

  const sales = saleMatch({ ...ctx, search: "" });

  const [saleTotal, cost, expenses, purchases, returns, posReceived, dueReceived, purchasePaid, supplierPaid] = await Promise.all([
    sum(POSOrder, sales, "$total"),
    POSOrder.aggregate([
      { $match: sales },
      { $unwind: "$items" },
      { $group: { _id: null, v: { $sum: { $multiply: ["$items.qty", { $ifNull: ["$items.purchasePrice", 0] }] } } } },
    ]).then((r) => r[0]?.v || 0),
    sum(ExpenseModel, { deletedAt: null, ...range(ctx, "expenseDate") }, "$amount"),
    sum(PurchaseModel, { deletedAt: null, status: { $ne: "cancelled" }, ...range(ctx, "purchaseDate") }, "$grandTotal"),
    sum(PurchaseReturn, { deletedAt: null, ...range(ctx, "returnDate") }, "$total"),
    sum(POSOrder, sales, "$paidAmount"),
    sum(CustomerPayment, { deletedAt: null, type: "receive", ...range(ctx, "date") }, "$amount"),
    PurchaseModel.aggregate([
      { $match: { deletedAt: null, status: { $ne: "cancelled" } } },
      { $unwind: "$payments" },
      { $match: { "payments.supplierPaymentId": null, ...range(ctx, "payments.paidAt") } },
      { $group: { _id: null, v: { $sum: "$payments.amount" } } },
    ]).then((r) => r[0]?.v || 0),
    sum(SupplierPayment, { deletedAt: null, type: "pay", ...range(ctx, "date") }, "$amount"),
  ]);

  return {
    sales: saleTotal,
    cost,
    expenses,
    purchases,
    returns,
    // a receipt spread over invoices is on those invoices too; counting
    // POS paid + receipts can double up a little, so "received" is an
    // indication of cash in, not a cash book
    received: posReceived + dueReceived,
    paid: purchasePaid + supplierPaid,
  };
}

// ---------------------------------------------------------------- reports

const partnerSales = (type, title) => ({
  title,
  group: "Dealer / Sub Dealer / Wholesaler",
  permission: "reports.sales",
  run: async (ctx) => ({ columns: SALE_COLUMNS.filter(([k]) => k !== "type"), rows: await saleRows(ctx, { customerType: type }) }),
});

const partnerDue = (type, title) => ({
  title,
  group: "Dealer / Sub Dealer / Wholesaler",
  permission: "reports.due",
  dated: false,
  run: (ctx) => customerRows(ctx, { type, dueOnly: true }),
});

const partnerProducts = (type, title) => ({
  title,
  group: "Dealer / Sub Dealer / Wholesaler",
  permission: "reports.sales",
  run: async (ctx) => {
    const rows = await POSOrder.aggregate([
      { $match: saleMatch({ ...ctx, search: "" }, { customerType: type }) },
      { $unwind: "$items" },
      ...(ctx.search ? [{ $match: { $or: [{ "items.productName": { $regex: escapeRegex(ctx.search), $options: "i" } }, { customerName: { $regex: escapeRegex(ctx.search), $options: "i" } }] } }] : []),
      {
        $group: {
          _id: { customer: "$customerName", product: "$items.productName" },
          qty: { $sum: "$items.qty" },
          amount: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { "_id.customer": 1, amount: -1 } },
      { $limit: MAX_ROWS },
    ]);
    return {
      columns: [
        ["customer", "Customer", "text"],
        ["product", "Product", "text"],
        ["qty", "Qty", "qty"],
        ["amount", "Amount", "money"],
      ],
      rows: rows.map((r) => ({ customer: r._id.customer, product: r._id.product, qty: r.qty, amount: r.amount })),
    };
  },
});

export const REPORTS = {
  // ----- sales (POS)
  "master-sales-report": {
    title: "Master Sales Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => ({ columns: SALE_COLUMNS, rows: await saleRows(ctx) }),
  },
  "detail-sale-report": {
    title: "Detail Sale Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => ({
      columns: [
        ["date", "Date", "date"],
        ["invoice", "Invoice No", "text"],
        ["customer", "Customer", "text"],
        ["product", "Product", "text"],
        ["variant", "Variant", "text"],
        ["imei", "IMEI", "text"],
        ["qty", "Qty", "qty"],
        ["price", "Price", "rate"],
        ["total", "Total", "money"],
      ],
      rows: (await soldLines(ctx)).slice(0, MAX_ROWS).map((r) => ({
        date: r.createdAt,
        invoice: r.orderNumber,
        customer: r.customerName,
        product: r.item.productName,
        variant: variantText(r.item),
        imei: (r.item.imeis || []).join(", "),
        qty: r.item.qty,
        price: r.item.price,
        total: r.item.subtotal,
      })),
    }),
  },
  "daily-sales-report": {
    title: "Daily Sales Report",
    group: "Sales",
    permission: "reports.sales",
    run: (ctx) => groupedSales(ctx, dayString("$createdAt"), "Date"),
  },
  "monthly-sales-report": {
    title: "Monthly Sales Report",
    group: "Sales",
    permission: "reports.sales",
    run: (ctx) => groupedSales(ctx, { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: TZ } }, "Month"),
  },
  "yearly-sales-report": {
    title: "Yearly Sales Report",
    group: "Sales",
    permission: "reports.sales",
    run: (ctx) => groupedSales(ctx, { $dateToString: { format: "%Y", date: "$createdAt", timezone: TZ } }, "Year"),
  },
  "employee-sales-report": {
    title: "Employee Sales Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => {
      const r = await groupedSales(ctx, { $ifNull: ["$soldBy", "—"] }, "Employee");
      r.rows.sort((a, b) => b.total - a.total);
      return r;
    },
  },
  "showroom-sales-report": {
    title: "Showroom Wise Sales Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => {
      const r = await groupedSales(ctx, "$showroomId", "Showroom");
      const ids = r.rows.map((row) => row.period).filter((id) => mongoose.isValidObjectId(id));
      const names = new Map(
        (await mongoose.connection.db.collection("showrooms").find({ _id: { $in: ids } }).project({ name: 1 }).toArray()).map((s) => [String(s._id), s.name]),
      );
      r.rows = r.rows.map((row) => ({ ...row, period: names.get(String(row.period)) || "—" })).sort((a, b) => b.total - a.total);
      return r;
    },
  },
  "customer-type-sales-report": {
    title: "Customer Type Wise Sales Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => {
      const r = await groupedSales(ctx, { $ifNull: ["$customerType", "retail"] }, "Customer Type");
      r.rows = r.rows.map((row) => ({ ...row, period: TYPE_LABEL[row.period] || row.period })).sort((a, b) => b.total - a.total);
      return r;
    },
  },
  "discounts-report": {
    title: "Discounts Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => ({
      columns: SALE_COLUMNS.filter(([k]) => ["date", "invoice", "customer", "type", "subtotal", "discount", "total"].includes(k)),
      rows: await saleRows(ctx, { discount: { $gt: 0 } }),
    }),
  },
  "vat-report": {
    title: "Vat Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => ({
      columns: [
        ["date", "Date", "date"],
        ["invoice", "Invoice No", "text"],
        ["customer", "Customer", "text"],
        ["subtotal", "Taxable", "money"],
        ["vat", "VAT", "money"],
        ["total", "Total", "money"],
      ],
      rows: await saleRows(ctx, { vat: { $gt: 0 } }),
    }),
  },
  "barcode-wise-sale-report": {
    title: "Barcode Wise Sale Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => {
      const rows = await POSOrder.aggregate([
        { $match: saleMatch({ ...ctx, search: "" }) },
        { $unwind: "$items" },
        { $group: { _id: "$items.variantId", product: { $first: "$items.productName" }, color: { $first: "$items.color" }, size: { $first: "$items.size" }, qty: { $sum: "$items.qty" }, amount: { $sum: "$items.subtotal" } } },
        { $lookup: { from: "productvariants", localField: "_id", foreignField: "_id", as: "v" } },
        { $project: { product: 1, color: 1, size: 1, qty: 1, amount: 1, barcode: { $ifNull: [{ $first: "$v.barcode" }, { $first: "$v.sku" }] } } },
        ...(ctx.search ? [{ $match: { $or: [{ product: { $regex: escapeRegex(ctx.search), $options: "i" } }, { barcode: { $regex: escapeRegex(ctx.search), $options: "i" } }] } }] : []),
        { $sort: { amount: -1 } },
        { $limit: MAX_ROWS },
      ]);
      return {
        columns: [
          ["barcode", "Barcode", "text"],
          ["product", "Product", "text"],
          ["variant", "Variant", "text"],
          ["qty", "Sold Qty", "qty"],
          ["amount", "Sale Amount", "money"],
        ],
        rows: rows.map((r) => ({ ...r, variant: variantText(r) })),
      };
    },
  },
  "details-sale-profit-loss-report": {
    title: "Details Sale Profit Loss Report",
    group: "Sales",
    permission: "reports.profitLoss",
    run: async (ctx) => ({
      columns: [
        ["date", "Date", "date"],
        ["invoice", "Invoice No", "text"],
        ["customer", "Customer", "text"],
        ["type", "Customer Type", "text"],
        ["product", "Product", "text"],
        ["qty", "Qty", "qty"],
        ["sale", "Sale", "money"],
        ["cost", "Cost", "money"],
        ["profit", "Profit", "money"],
      ],
      rows: (await soldLines(ctx)).slice(0, MAX_ROWS).map((r) => {
        const cost = round((r.item.qty || 0) * (r.item.purchasePrice || 0));
        return {
          date: r.createdAt,
          invoice: r.orderNumber,
          customer: r.customerName,
          type: TYPE_LABEL[r.customerType] || TYPE_LABEL.retail,
          product: [r.item.productName, variantText(r.item)].filter(Boolean).join(" — "),
          qty: r.item.qty,
          sale: r.item.subtotal,
          cost,
          profit: round(r.item.subtotal - cost),
        };
      }),
    }),
  },
  "product-wise-profit-loss-report": {
    title: "Product Wise Profit/Loss Report",
    group: "Sales",
    permission: "reports.profitLoss",
    run: async (ctx) => {
      const rows = await POSOrder.aggregate([
        { $match: saleMatch({ ...ctx, search: "" }) },
        { $unwind: "$items" },
        ...(ctx.search ? [{ $match: { "items.productName": { $regex: escapeRegex(ctx.search), $options: "i" } } }] : []),
        {
          $group: {
            _id: "$items.productName",
            qty: { $sum: "$items.qty" },
            sale: { $sum: "$items.subtotal" },
            cost: { $sum: { $multiply: ["$items.qty", { $ifNull: ["$items.purchasePrice", 0] }] } },
          },
        },
        { $sort: { sale: -1 } },
        { $limit: MAX_ROWS },
      ]);
      return {
        columns: [
          ["product", "Product", "text"],
          ["qty", "Qty", "qty"],
          ["sale", "Sale", "money"],
          ["cost", "Cost", "money"],
          ["profit", "Profit", "money"],
        ],
        rows: rows.map((r) => ({ product: r._id, qty: r.qty, sale: r.sale, cost: r.cost, profit: round(r.sale - r.cost) })),
      };
    },
  },
  "categories-report": {
    title: "Categories Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => {
      const rows = await POSOrder.aggregate([
        { $match: saleMatch({ ...ctx, search: "" }) },
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "p" } },
        { $lookup: { from: "categories", localField: "p.category", foreignField: "_id", as: "c" } },
        { $group: { _id: { $ifNull: [{ $first: "$c.name" }, "Uncategorised"] }, qty: { $sum: "$items.qty" }, amount: { $sum: "$items.subtotal" } } },
        ...(ctx.search ? [{ $match: { _id: { $regex: escapeRegex(ctx.search), $options: "i" } } }] : []),
        { $sort: { amount: -1 } },
      ]);
      return {
        columns: [
          ["category", "Category", "text"],
          ["qty", "Sold Qty", "qty"],
          ["amount", "Sale Amount", "money"],
        ],
        rows: rows.map((r) => ({ category: r._id, qty: r.qty, amount: r.amount })),
      };
    },
  },
  "exchange-report": {
    title: "Exchange Report",
    group: "Sales",
    permission: "reports.sales",
    run: async (ctx) => {
      const orders = await POSOrder.find(saleMatch(ctx, { orderType: "exchange" }))
        .select("createdAt orderNumber customerName total exchange.returnedTotal exchange.reason")
        .sort({ createdAt: -1 })
        .limit(MAX_ROWS)
        .lean();
      return {
        columns: [
          ["date", "Date", "date"],
          ["invoice", "Invoice No", "text"],
          ["customer", "Customer", "text"],
          ["returned", "Returned Value", "money"],
          ["total", "New Sale", "money"],
          ["reason", "Reason", "text"],
        ],
        rows: orders.map((o) => ({
          date: o.createdAt,
          invoice: o.orderNumber,
          customer: o.customerName,
          returned: o.exchange?.returnedTotal || 0,
          total: o.total,
          reason: o.exchange?.reason || "",
        })),
      };
    },
  },
  "payment-schedule-report": {
    title: "Payment Schedule Report",
    group: "Sales",
    permission: "reports.due",
    run: async (ctx) => ({
      columns: SALE_COLUMNS.filter(([k]) => ["date", "invoice", "customer", "type", "total", "paid", "due"].includes(k)),
      rows: (await saleRows(ctx, { dueAmount: { $gt: 0.009 } })).reverse(),
    }),
  },

  // ----- dealer / sub dealer / wholesaler
  "dealer-sales-report": partnerSales("dealer", "Dealer Sales Report"),
  "sub-dealer-sales-report": partnerSales("subDealer", "Sub Dealer Sales Report"),
  "wholesaler-sales-report": partnerSales("wholesaler", "Wholesaler Sales Report"),
  "dealer-product-report": partnerProducts("dealer", "Dealer Product Wise Report"),
  "sub-dealer-product-report": partnerProducts("subDealer", "Sub Dealer Product Wise Report"),
  "wholesaler-product-report": partnerProducts("wholesaler", "Wholesaler Product Wise Report"),
  "dealer-due-report": partnerDue("dealer", "Dealer Due Report"),
  "sub-dealer-due-report": partnerDue("subDealer", "Sub Dealer Due Report"),
  "wholesaler-due-report": partnerDue("wholesaler", "Wholesaler Due Report"),
  "partner-orders-report": {
    title: "Partner Orders Report",
    group: "Dealer / Sub Dealer / Wholesaler",
    permission: "reports.sales",
    run: async (ctx) => {
      const orders = await PartnerOrder.find({
        ...range(ctx, "createdAt"),
        ...searchOn(ctx, ["orderNumber", "customerName", "phone", "invoiceNumber", "status"]),
      })
        .sort({ createdAt: -1 })
        .limit(MAX_ROWS)
        .lean();
      return {
        columns: [
          ["date", "Date", "date"],
          ["order", "Order No", "text"],
          ["partner", "Partner", "text"],
          ["type", "Type", "text"],
          ["qty", "Qty", "qty"],
          ["total", "Total", "money"],
          ["status", "Status", "text"],
          ["invoice", "Invoice", "text"],
        ],
        rows: orders.map((o) => ({
          date: o.createdAt,
          order: o.orderNumber,
          partner: o.customerName,
          type: TYPE_LABEL[o.customerType] || o.customerType,
          qty: o.items.reduce((sum, item) => sum + (item.qty || 0), 0),
          total: o.total,
          status: o.status,
          invoice: o.invoiceNumber || "",
        })),
      };
    },
  },

  // ----- purchases
  "purchases-report": {
    title: "Purchases Report",
    group: "Purchases",
    permission: "purchase.view",
    run: async (ctx) => {
      const purchases = await PurchaseModel.find({
        deletedAt: null,
        status: { $ne: "cancelled" },
        ...range(ctx, "purchaseDate"),
        ...searchOn(ctx, ["purchaseNumber", "referenceNo", "supplierName"]),
        ...(ctx.dueOnly && { dueAmount: { $gt: 0.009 } }),
      })
        .select("purchaseDate purchaseNumber supplierName items.quantity items.extraQty grandTotal paidAmount dueAmount status createdBy")
        .sort({ purchaseDate: -1 })
        .limit(MAX_ROWS)
        .lean();
      return {
        columns: [
          ["date", "Date", "date"],
          ["invoice", "Invoice No", "text"],
          ["supplier", "Supplier", "text"],
          ["qty", "Qty", "qty"],
          ["total", "Total", "money"],
          ["paid", "Paid", "money"],
          ["due", "Due", "money"],
          ["status", "Stock", "text"],
          ["by", "Created By", "text"],
        ],
        rows: purchases.map((p) => ({
          date: p.purchaseDate,
          invoice: p.purchaseNumber,
          supplier: p.supplierName,
          qty: p.items.reduce((sum, item) => sum + (item.quantity || 0) + (item.extraQty || 0), 0),
          total: p.grandTotal,
          paid: p.paidAmount,
          due: p.dueAmount,
          status: p.status,
          by: p.createdBy || "",
        })),
      };
    },
  },
  "payable-schedule-report": {
    title: "Payable Schedule Report",
    group: "Purchases",
    permission: "purchase.view",
    run: (ctx) => REPORTS["purchases-report"].run({ ...ctx, dueOnly: true }),
  },
  "purchases-return-report": {
    title: "Purchases Return Report",
    group: "Purchases",
    permission: "purchase.view",
    run: async (ctx) => {
      const returns = await PurchaseReturn.find({
        deletedAt: null,
        ...range(ctx, "returnDate"),
        ...searchOn(ctx, ["returnNumber", "supplierName"]),
      })
        .sort({ returnDate: -1 })
        .limit(MAX_ROWS)
        .lean();
      return {
        columns: [
          ["date", "Date", "date"],
          ["invoice", "Return No", "text"],
          ["supplier", "Supplier", "text"],
          ["qty", "Qty", "qty"],
          ["total", "Total", "money"],
          ["refund", "Refund", "money"],
          ["note", "Note", "text"],
        ],
        rows: returns.map((r) => ({
          date: r.returnDate,
          invoice: r.returnNumber,
          supplier: r.supplierName,
          qty: r.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
          total: r.total,
          refund: r.refundAmount,
          note: r.note || "",
        })),
      };
    },
  },
  "purchases-order-report": {
    title: "Purchases Order Report",
    group: "Purchases",
    permission: "purchase.view",
    run: async (ctx) => {
      const orders = await PurchaseOrder.find({
        deletedAt: null,
        ...range(ctx, "orderDate"),
        ...searchOn(ctx, ["orderNumber", "supplierName", "status"]),
      })
        .select("orderDate deliveryDate orderNumber supplierName status total purchaseNumber")
        .sort({ orderDate: -1 })
        .limit(MAX_ROWS)
        .lean();
      return {
        columns: [
          ["date", "Date", "date"],
          ["delivery", "Delivery Date", "date"],
          ["invoice", "Order No", "text"],
          ["supplier", "Supplier", "text"],
          ["status", "Status", "text"],
          ["purchase", "Purchase No", "text"],
          ["total", "Total", "money"],
        ],
        rows: orders.map((o) => ({
          date: o.orderDate,
          delivery: o.deliveryDate,
          invoice: o.orderNumber,
          supplier: o.supplierName,
          status: o.status,
          purchase: o.purchaseNumber || "",
          total: o.total,
        })),
      };
    },
  },

  // ----- contacts
  "customers-report": { title: "Customers Report", group: "Contacts", permission: "reports.due", dated: false, run: (ctx) => customerRows(ctx, {}) },
  "customer-due-report": { title: "Customer Due Report", group: "Contacts", permission: "reports.due", dated: false, run: (ctx) => customerRows(ctx, { dueOnly: true }) },
  "suppliers-report": { title: "Suppliers Report", group: "Contacts", permission: "reports.due", dated: false, run: (ctx) => supplierRows(ctx, false) },
  "supplier-due-report": { title: "Supplier Due Report", group: "Contacts", permission: "reports.due", dated: false, run: (ctx) => supplierRows(ctx, true) },
  "payment-received-report": {
    title: "Payment Received Report",
    group: "Contacts",
    permission: "reports.due",
    run: async (ctx) => {
      const [fromCustomers, fromSuppliers] = await Promise.all([
        CustomerPayment.find({ deletedAt: null, type: "receive", ...range(ctx, "date") }).populate("customerId", "name type").sort({ date: -1 }).limit(MAX_ROWS).lean(),
        SupplierPayment.find({ deletedAt: null, type: "receive", ...range(ctx, "date") }).populate("supplierId", "name").sort({ date: -1 }).limit(MAX_ROWS).lean(),
      ]);
      const rows = [
        ...fromCustomers.map((p) => ({
          date: p.date,
          invoice: p.invoiceNo,
          from: p.customerId?.name || "",
          type: TYPE_LABEL[p.customerId?.type] || "Customer",
          method: p.method,
          by: p.createdBy || "",
          amount: p.amount,
        })),
        ...fromSuppliers.map((p) => ({
          date: p.date,
          invoice: p.invoiceNo,
          from: p.supplierId?.name || "",
          type: "Supplier",
          method: p.method,
          by: p.createdBy || "",
          amount: p.amount,
        })),
      ]
        .filter((r) => !ctx.search || [r.invoice, r.from, r.method, r.by].join(" ").toLowerCase().includes(ctx.search.toLowerCase()))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      return {
        columns: [
          ["date", "Date", "date"],
          ["invoice", "Receipt", "text"],
          ["from", "From", "text"],
          ["type", "Type", "text"],
          ["method", "Method", "text"],
          ["by", "Received By", "text"],
          ["amount", "Amount", "money"],
        ],
        rows,
      };
    },
  },

  // ----- products
  "products-report": {
    title: "Products Report",
    group: "Products",
    permission: "reports.inventory",
    dated: false,
    run: async (ctx) => {
      const products = await ProductModel.find({ deletedAt: null, ...searchOn(ctx, ["name", "code", "brand"]) })
        .select("name code brand category sellingPrice dealerPrice subDealerPrice wholesalerPrice")
        .populate("category", "name")
        .sort({ name: 1 })
        .limit(MAX_ROWS)
        .lean();
      const ids = products.map((p) => p._id);
      const [wh, sr] = await Promise.all([
        WarehouseStock.aggregate([{ $match: { productId: { $in: ids } } }, { $group: { _id: "$productId", stock: { $sum: "$stock" } } }]),
        ShowroomStock.aggregate([{ $match: { productId: { $in: ids } } }, { $group: { _id: "$productId", stock: { $sum: "$stock" } } }]),
      ]);
      const stock = new Map();
      for (const row of [...wh, ...sr]) stock.set(String(row._id), (stock.get(String(row._id)) || 0) + row.stock);
      return {
        columns: [
          ["name", "Product", "text"],
          ["code", "Code", "text"],
          ["category", "Category", "text"],
          ["brand", "Brand", "text"],
          ["stock", "Stock", "qty"],
          ["buyer", "Buyer Price", "rate"],
          ["dealer", "Dealer", "rate"],
          ["subDealer", "Sub Dealer", "rate"],
          ["wholesaler", "Wholesaler", "rate"],
        ],
        rows: products.map((p) => ({
          name: p.name,
          code: p.code || "",
          category: p.category?.name || "",
          brand: p.brand || "",
          stock: stock.get(String(p._id)) || 0,
          buyer: p.sellingPrice,
          dealer: p.dealerPrice,
          subDealer: p.subDealerPrice,
          wholesaler: p.wholesalerPrice,
        })),
      };
    },
  },
  "barcode-wise-product-report": {
    title: "Barcode Wise Product Report",
    group: "Products",
    permission: "reports.inventory",
    dated: false,
    run: async (ctx) => {
      const matchProducts = ctx.search
        ? (await ProductModel.find({ deletedAt: null, name: { $regex: escapeRegex(ctx.search), $options: "i" } }).select("_id").limit(500).lean()).map((p) => p._id)
        : null;
      const variants = await ProductVariant.find({
        deletedAt: null,
        ...(ctx.search && {
          $or: [
            { barcode: { $regex: escapeRegex(ctx.search), $options: "i" } },
            { sku: { $regex: escapeRegex(ctx.search), $options: "i" } },
            { product: { $in: matchProducts } },
          ],
        }),
      })
        .populate("product", "name sellingPrice deletedAt")
        .limit(MAX_ROWS)
        .lean();
      const live = variants.filter((v) => v.product && !v.product.deletedAt);
      const ids = live.map((v) => v._id);
      const [wh, sr] = await Promise.all([
        WarehouseStock.aggregate([{ $match: { variantId: { $in: ids } } }, { $group: { _id: "$variantId", stock: { $sum: "$stock" } } }]),
        ShowroomStock.aggregate([{ $match: { variantId: { $in: ids } } }, { $group: { _id: "$variantId", stock: { $sum: "$stock" } } }]),
      ]);
      const stock = new Map();
      for (const row of [...wh, ...sr]) stock.set(String(row._id), (stock.get(String(row._id)) || 0) + row.stock);
      return {
        columns: [
          ["barcode", "Barcode", "text"],
          ["product", "Product", "text"],
          ["variant", "Variant", "text"],
          ["cost", "Purchase Price", "rate"],
          ["price", "Selling Price", "rate"],
          ["stock", "Stock", "qty"],
          ["value", "Stock Value", "money"],
        ],
        rows: live
          .map((v) => {
            const qty = stock.get(String(v._id)) || 0;
            return {
              barcode: v.barcode || v.sku,
              product: v.product.name,
              variant: variantText(v),
              cost: v.purchasePrice || 0,
              price: v.sellingPrice || v.product.sellingPrice || 0,
              stock: qty,
              value: round(qty * (v.purchasePrice || 0)),
            };
          })
          .sort((a, b) => a.product.localeCompare(b.product)),
      };
    },
  },

  // ----- money
  "expense-report": {
    title: "Expense Report",
    group: "Money",
    permission: "expenses.view",
    run: async (ctx) => {
      const expenses = await ExpenseModel.find({
        deletedAt: null,
        ...range(ctx, "expenseDate"),
        ...searchOn(ctx, ["categoryName", "note", "title", "createdBy"]),
      })
        .sort({ expenseDate: -1 })
        .limit(MAX_ROWS)
        .lean();
      return {
        columns: [
          ["date", "Date", "date"],
          ["type", "Expense Type", "text"],
          ["note", "Note", "text"],
          ["method", "Payment Type", "text"],
          ["by", "By", "text"],
          ["amount", "Amount", "money"],
        ],
        rows: expenses.map((e) => ({
          date: e.expenseDate,
          type: e.categoryName,
          note: [e.title, e.note].filter(Boolean).join(" · "),
          method: e.paymentMethod,
          by: e.createdBy || "",
          amount: e.amount,
        })),
      };
    },
  },
  "profit-loss-report": {
    title: "Profit/Loss Report",
    group: "Money",
    permission: "reports.profitLoss",
    totals: false,
    run: async (ctx) => {
      const f = await figures(ctx);
      const gross = f.sales - f.cost;
      return {
        columns: [
          ["item", "Particulars", "text"],
          ["amount", "Amount", "money"],
        ],
        rows: [
          { item: "Total Sales", amount: f.sales },
          { item: "Less: Cost of Goods Sold", amount: -f.cost },
          { item: "Gross Profit", amount: round(gross) },
          { item: "Less: Expenses", amount: -f.expenses },
          { item: "Net Profit", amount: round(gross - f.expenses) },
        ],
      };
    },
  },
  summary: {
    title: "Summary",
    group: "Money",
    permission: "reports.profitLoss",
    totals: false,
    run: async (ctx) => {
      const f = await figures(ctx);
      const labels = [
        ["sales", "Sales"],
        ["cost", "Cost of Goods Sold"],
        ["purchases", "Purchases"],
        ["returns", "Purchase Returns"],
        ["expenses", "Expenses"],
        ["received", "Money Received"],
        ["paid", "Money Paid to Suppliers"],
      ];
      return {
        columns: [
          ["item", "Particulars", "text"],
          ["amount", "Amount", "money"],
        ],
        rows: labels.map(([key, item]) => ({ item, amount: round(f[key]) })),
      };
    },
  },
};

/** Report list for the menu: [key, title, group, dated] */
export const REPORT_LIST = Object.entries(REPORTS).map(([key, r]) => ({
  key,
  title: r.title,
  group: r.group,
  dated: r.dated !== false,
}));

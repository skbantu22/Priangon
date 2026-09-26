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
import StockAdjustment from "@/models/StockAdjustment.model";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import SalarySheet from "@/models/SalarySheet.model";
import SaleReturn from "@/models/SaleReturn.model";
import EmployeeCommission from "@/models/EmployeeCommission.model";
import { customerBalances, customerLedger } from "@/lib/customerService";
import { supplierBalances, supplierLedger } from "@/lib/supplierService";
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

// Paid / Partial / Due, the way the status badge reads
const PAYMENT_MATCH = {
  paid: { dueAmount: { $lte: 0.009 } },
  partial: { dueAmount: { $gt: 0.009 }, paidAmount: { $gt: 0 } },
  due: { dueAmount: { $gt: 0.009 }, paidAmount: { $lte: 0 } },
};

const paymentStatus = (paid, due) => (due > 0.009 ? (paid > 0 ? "Partial" : "Due") : "Paid");

const saleMatch = (ctx, extra = {}) => ({
  status: "completed",
  ...range(ctx, "createdAt"),
  ...(ctx.showroomId && { showroomId: new mongoose.Types.ObjectId(ctx.showroomId) }),
  ...(ctx.customerType && { customerType: ctx.customerType }),
  ...(ctx.soldBy && { soldBy: ctx.soldBy }),
  ...(ctx.paidBy && { "payments.type": ctx.paidBy }),
  ...(PAYMENT_MATCH[ctx.paymentStatus] || {}),
  ...searchOn(ctx, ["orderNumber", "customerName", "phone", "soldBy"]),
  ...extra,
});

const SALE_COLUMNS = [
  ["date", "Date", "date"],
  ["invoice", "Invoice", "invoice"],
  ["soldBy", "Employee", "text"],
  ["customer", "Customer", "text"],
  ["phone", "Phone", "text"],
  ["type", "Customer Type", "text"],
  ["qty", "Qty", "qty"],
  ["subtotal", "Subtotal", "money"],
  ["discount", "Discount", "money"],
  ["vat", "Vat", "money"],
  ["total", "Total", "money"],
  ["paid", "Paid", "money"],
  ["paidBy", "Paid By", "text"],
  ["due", "Due", "money"],
  ["returned", "Return Amount", "money"],
  ["status", "Payment Status", "status"],
];

async function saleRows(ctx, extra) {
  const orders = await POSOrder.find(saleMatch(ctx, extra))
    .select("createdAt orderNumber customerName customerType phone soldBy showroomId items.qty subTotal discount vat total paidAmount dueAmount payments.type exchange.returnedTotal")
    .sort({ createdAt: -1 })
    .limit(MAX_ROWS)
    .lean();

  return orders.map((o) => ({
    link: "/admin/print/" + o._id,
    status: paymentStatus(o.paidAmount, o.dueAmount),
    date: o.createdAt,
    invoice: o.orderNumber,
    customer: o.customerName,
    phone: o.phone || "",
    showroomId: o.showroomId,
    paidBy: [...new Set((o.payments || []).map((p) => p.type).filter(Boolean))].join(", "),
    returned: o.exchange?.returnedTotal || 0,
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
  const customerType = type || ctx.customerType;
  const customers = await CustomerModel.find({
    ...(customerType && { type: customerType }),
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

  const [saleTotal, cost, expenses, purchases, returns, posReceived, dueReceived, purchasePaid, supplierPaid, discount, vat, exchangeBack, salary, commission, saleBack, costBack] = await Promise.all([
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
    sum(POSOrder, sales, "$discount"),
    sum(POSOrder, sales, "$vat"),
    sum(POSOrder, { ...sales, orderType: "exchange" }, "$exchange.returnedTotal"),
    sum(SalarySheet, { deletedAt: null, ...range(ctx, "paidDate") }, "$total"),
    sum(EmployeeCommission, { deletedAt: null, type: "paid", ...range(ctx, "date") }, "$amount"),
    sum(SaleReturn, { deletedAt: null, ...range(ctx, "returnDate"), ...(ctx.showroomId && { showroomId: new mongoose.Types.ObjectId(ctx.showroomId) }) }, "$total"),
    SaleReturn.aggregate([
      { $match: { deletedAt: null, ...range(ctx, "returnDate"), ...(ctx.showroomId && { showroomId: new mongoose.Types.ObjectId(ctx.showroomId) }) } },
      { $unwind: "$items" },
      { $group: { _id: null, v: { $sum: { $multiply: ["$items.qty", "$items.purchasePrice"] } } } },
    ]).then((rows) => rows[0]?.v || 0),
  ]);
  // exchanged goods and sales returns both come back; their cost comes off COGS
  const saleReturns = exchangeBack + saleBack;

  return {
    sales: saleTotal,
    cost: cost - costBack,
    expenses,
    purchases,
    returns,
    // a receipt spread over invoices is on those invoices too; counting
    // POS paid + receipts can double up a little, so "received" is an
    // indication of cash in, not a cash book
    received: posReceived + dueReceived,
    paid: purchasePaid + supplierPaid,
    discount,
    vat,
    saleReturns,
    salary,
    commission,
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
        ...(ctx.customerType && { customerType: ctx.customerType }),
        ...(ctx.orderStatus && { status: ctx.orderStatus }),
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
        ...(ctx.supplierId && { supplierId: ctx.supplierId }),
        ...(ctx.paymentStatus && { paymentStatus: ctx.paymentStatus === "due" ? "unpaid" : ctx.paymentStatus }),
      })
        .select("purchaseDate purchaseNumber supplierName items.quantity items.extraQty grandTotal paidAmount dueAmount status createdBy")
        .sort({ purchaseDate: -1 })
        .limit(MAX_ROWS)
        .lean();
      return {
        columns: [
          ["date", "Date", "date"],
          ["invoice", "Invoice No", "invoice"],
          ["supplier", "Supplier", "text"],
          ["qty", "Qty", "qty"],
          ["total", "Total", "money"],
          ["paid", "Paid", "money"],
          ["due", "Due", "money"],
          ["payment", "Status", "status"],
          ["status", "Stock", "text"],
          ["by", "Created By", "text"],
        ],
        rows: purchases.map((p) => ({
          link: "/admin/purchase/" + p._id,
          payment: paymentStatus(p.paidAmount, p.dueAmount),
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
        ...(ctx.supplierId && { supplierId: ctx.supplierId }),
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
        ...(ctx.supplierId && { supplierId: ctx.supplierId }),
        ...(ctx.orderStatus && { status: ctx.orderStatus }),
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
      const products = await ProductModel.find({
        deletedAt: null,
        ...searchOn(ctx, ["name", "code", "brand"]),
        ...(ctx.categoryId && { category: ctx.categoryId }),
        ...(ctx.brand && { brand: ctx.brand }),
      })
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
      const inScope =
        ctx.categoryId || ctx.brand
          ? (
              await ProductModel.find({ deletedAt: null, ...(ctx.categoryId && { category: ctx.categoryId }), ...(ctx.brand && { brand: ctx.brand }) })
                .select("_id")
                .lean()
            ).map((p) => p._id)
          : null;
      const matchProducts = ctx.search
        ? (await ProductModel.find({ deletedAt: null, name: { $regex: escapeRegex(ctx.search), $options: "i" } }).select("_id").limit(500).lean()).map((p) => p._id)
        : null;
      const variants = await ProductVariant.find({
        deletedAt: null,
        ...(inScope && { product: { $in: inScope } }),
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
        ...(ctx.expenseTypeId && { categoryId: ctx.expenseTypeId }),
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
      const netSale = f.sales - f.saleReturns;
      const gross = netSale - f.cost;
      const net = gross - f.expenses - f.salary - f.commission;
      const a = [["Total Sale", f.sales], ["Sale Return", f.saleReturns], ["Discount", f.discount], ["Vat", f.vat], ["Net Sale", netSale]];
      const b = [["Total Purchase", f.purchases], ["Purchase Return", f.returns], ["Net Purchase", f.purchases - f.returns], ["Cost of Goods Sold", f.cost], ["Gross Profit", gross]];
      const c = [
        ["Expense", f.expenses],
        ["Salary", f.salary],
        ["Commission", f.commission],
        ["Total Expense", f.expenses + f.salary + f.commission],
        [net >= 0 ? "Net Profit" : "Net Loss", net],
      ];
      return {
        columns: [
          ["a", "Item", "text"],
          ["a_amt", "Amount", "rate"],
          ["b", "Item", "text"],
          ["b_amt", "Amount", "rate"],
          ["c", "Item", "text"],
          ["c_amt", "Amount", "rate"],
        ],
        rows: Array.from({ length: Math.max(a.length, b.length, c.length) }, (_, i) => ({
          a: a[i]?.[0] ?? "",
          a_amt: a[i] ? round(a[i][1]) : "",
          b: b[i]?.[0] ?? "",
          b_amt: b[i] ? round(b[i][1]) : "",
          c: c[i]?.[0] ?? "",
          c_amt: c[i] ? round(c[i][1]) : "",
        })),
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
        ["sales", "Total Sale"],
        ["saleReturns", "Sale Return"],
        ["discount", "Discount"],
        ["vat", "Vat"],
        ["cost", "Cost of Goods Sold"],
        ["purchases", "Total Purchase"],
        ["returns", "Purchase Return"],
        ["expenses", "Expense"],
        ["salary", "Salary"],
        ["commission", "Commission Paid"],
        ["received", "Money Received"],
        ["paid", "Money Paid"],
      ];
      return {
        columns: [
          ["item", "Description", "text"],
          ["amount", "Amount", "rate"],
        ],
        rows: [
          ...labels.map(([key, item]) => ({ item, amount: round(f[key]) })),
          { item: "Net Profit", amount: round(f.sales - f.saleReturns - f.cost - f.expenses - f.salary - f.commission) },
        ],
      };
    },
  },
};

// ------------------------------------------------------------ stock

/** Units, value and in/out per variant per place (warehouse or branch) */
async function stockRows(ctx) {
  const productFilter = {
    deletedAt: null,
    ...(ctx.categoryId && { category: new mongoose.Types.ObjectId(ctx.categoryId) }),
    ...(ctx.brand && { brand: ctx.brand }),
    ...(ctx.search && { name: { $regex: escapeRegex(ctx.search), $options: "i" } }),
  };
  const products = await ProductModel.find(productFilter).select("name sellingPrice alertQuantity").lean();
  const productOf = new Map(products.map((p) => [String(p._id), p]));
  const variants = await ProductVariant.find({ deletedAt: null, product: { $in: products.map((p) => p._id) } })
    .select("product barcode sku color size purchasePrice sellingPrice")
    .lean();
  const variantOf = new Map(variants.map((v) => [String(v._id), v]));
  const ids = variants.map((v) => v._id);

  const wantWarehouse = !ctx.location || ctx.location === "warehouse";
  const branchId = ctx.location && ctx.location !== "warehouse" ? new mongoose.Types.ObjectId(ctx.location) : null;

  const [wh, sr, moves, names] = await Promise.all([
    wantWarehouse ? WarehouseStock.find({ variantId: { $in: ids } }).select("variantId stock").lean() : [],
    ctx.location === "warehouse" ? [] : ShowroomStock.find({ variantId: { $in: ids }, ...(branchId && { showroomId: branchId }) }).select("showroomId variantId stock").lean(),
    InventoryTransaction.aggregate([
      { $match: { variantId: { $in: ids } } },
      {
        $group: {
          _id: { variantId: "$variantId", showroomId: "$showroomId" },
          inQty: { $sum: { $cond: [{ $in: ["$type", ["IN", "OPENING", "RETURN", "TRANSFER_IN"]] }, "$quantity", 0] } },
          outQty: { $sum: { $cond: [{ $in: ["$type", ["OUT", "SALE", "TRANSFER_OUT", "DAMAGE"]] }, "$quantity", 0] } },
        },
      },
    ]),
    mongoose.connection.db.collection("showrooms").find({}).project({ name: 1 }).toArray(),
  ]);
  const branchName = new Map(names.map((b) => [String(b._id), b.name]));
  const moveOf = new Map(moves.map((m) => [`${m._id.showroomId || "warehouse"}:${m._id.variantId}`, m]));

  const rows = [
    ...wh.map((row) => ({ place: "warehouse", name: "Warehouse", row })),
    ...sr.map((row) => ({ place: String(row.showroomId), name: branchName.get(String(row.showroomId)) || "Branch", row })),
  ].map(({ place, name, row }) => {
    const v = variantOf.get(String(row.variantId));
    const p = productOf.get(String(v?.product));
    const move = moveOf.get(`${place}:${row.variantId}`);
    const stock = Number(row.stock) || 0;
    return {
      variantId: String(row.variantId),
      product: p?.name || "",
      alertQty: Number(p?.alertQuantity) || 0,
      barcode: v?.barcode || v?.sku || "",
      branch: name,
      size: v?.size || "",
      color: v?.color || "",
      inQty: move?.inQty || 0,
      outQty: move?.outQty || 0,
      stock,
      cost: Number(v?.purchasePrice) || 0,
      price: Number(v?.sellingPrice) || Number(p?.sellingPrice) || 0,
      value: round(stock * (Number(v?.purchasePrice) || 0)),
    };
  });

  return rows.sort((a, b) => a.product.localeCompare(b.product) || a.branch.localeCompare(b.branch));
}

const ledgerReport = (kind) => async (ctx) => {
  const columns = [
    ["date", "Date", "date"],
    ["type", "Type", "text"],
    ["invoice", "Invoice", "text"],
    ["note", "Note", "text"],
    ["debit", "Debit", "money"],
    ["credit", "Credit", "money"],
    ["balance", "Balance", "rate"],
  ];
  const id = kind === "customer" ? ctx.customerId : ctx.supplierId;
  if (!id) return { columns, rows: [] };

  const Model = kind === "customer" ? CustomerModel : SupplierModel;
  const contact = await Model.findById(id).lean();
  if (!contact) return { columns, rows: [] };

  const period = { start: ctx.from, end: ctx.to };
  const ledger = kind === "customer" ? await customerLedger(contact, period) : await supplierLedger(contact, period);
  return {
    columns,
    rows: ledger.rows.map((r) => ({
      date: r.date,
      type: r.type,
      invoice: r.invoiceNo,
      note: r.note,
      debit: r.amount > 0 ? r.amount : 0,
      credit: r.amount < 0 ? -r.amount : 0,
      balance: r.balance,
    })),
  };
};

Object.assign(REPORTS, {
  "counter-wise-sale": {
    title: "Counterwise Sale Report",
    permission: "reports.sales",
    run: async (ctx) => {
      const rows = await saleRows(ctx);
      const names = new Map(
        (await mongoose.connection.db.collection("showrooms").find({}).project({ name: 1 }).toArray()).map((b) => [String(b._id), b.name]),
      );
      return {
        columns: [SALE_COLUMNS[0], SALE_COLUMNS[1], ["counter", "Cash Counter", "text"], ...SALE_COLUMNS.slice(3).filter(([k]) => k !== "type" && k !== "qty")],
        rows: rows.map((r) => ({ ...r, counter: names.get(String(r.showroomId)) || "Main Counter" })),
      };
    },
  },
  "stock-report": {
    title: "Stock Report",
    permission: "reports.inventory",
    dated: false,
    run: async (ctx) => ({
      columns: [
        ["product", "Product Name", "text"],
        ["barcode", "Barcode", "text"],
        ["branch", "Branch", "text"],
        ["size", "Size", "text"],
        ["color", "Color", "text"],
        ["inQty", "In Quantity", "qty"],
        ["outQty", "Out Quantity", "qty"],
        ["stock", "Stock", "qty"],
        ["cost", "Stock Purchase Price", "rate"],
        ["price", "Selling Price", "rate"],
        ["value", "Stock Total Price", "money"],
      ],
      rows: await stockRows(ctx),
    }),
  },
  "low-stock-product-report": {
    title: "Low Stock Product Report",
    permission: "reports.inventory",
    dated: false,
    run: async (ctx) => {
      // a variant's stock everywhere against its product's alert quantity
      const byVariant = new Map();
      for (const r of await stockRows(ctx)) {
        const row = byVariant.get(r.variantId);
        if (row) row.stock += r.stock;
        else byVariant.set(r.variantId, { product: `${r.product}${r.barcode ? ` (${r.barcode})` : ""}`, alertQty: r.alertQty, stock: r.stock });
      }
      return {
        columns: [
          ["product", "Product Name", "text"],
          ["alertQty", "Alert Qty", "qty"],
          ["stock", "Stock Qty", "qty"],
        ],
        rows: [...byVariant.values()].filter((r) => r.stock <= r.alertQty).sort((a, b) => a.stock - b.stock),
      };
    },
  },
  "expiry-product-report": {
    title: "Expiry Product Report",
    permission: "reports.inventory",
    run: async (ctx) => {
      const rows = await PurchaseModel.aggregate([
        { $match: { deletedAt: null, status: "received" } },
        { $unwind: "$items" },
        { $match: { "items.expireDate": { $ne: null }, ...range(ctx, "items.expireDate") } },
        ...(ctx.search ? [{ $match: { $or: [{ "items.productName": { $regex: escapeRegex(ctx.search), $options: "i" } }, { "items.sku": { $regex: escapeRegex(ctx.search), $options: "i" } }] } }] : []),
        {
          $project: {
            branch: { $ifNull: ["$locationName", "Warehouse"] },
            product: "$items.productName",
            sku: "$items.sku",
            expiry: "$items.expireDate",
            qty: { $subtract: [{ $add: ["$items.quantity", { $ifNull: ["$items.extraQty", 0] }] }, { $ifNull: ["$items.returnedQty", 0] }] },
          },
        },
        { $match: { qty: { $gt: 0 } } },
        { $sort: { expiry: 1 } },
        { $limit: MAX_ROWS },
      ]);
      return {
        columns: [
          ["branch", "Bussiness/Branch", "text"],
          ["product", "Product Name", "text"],
          ["sku", "SKU", "text"],
          ["expiry", "Expiry Date", "date"],
          ["qty", "Expiry Quantity", "qty"],
        ],
        rows,
      };
    },
  },
  "stock-adjustments-report": {
    title: "Stock Adjustments Report",
    permission: "reports.inventory",
    run: async (ctx) => {
      const adjustments = await StockAdjustment.find({
        ...range(ctx, "adjustmentDate"),
        ...(ctx.location === "warehouse" && { locationType: "WAREHOUSE" }),
        ...(ctx.location && ctx.location !== "warehouse" && { locationId: ctx.location }),
        ...(ctx.search && { $or: [{ adjustmentNumber: { $regex: escapeRegex(ctx.search), $options: "i" } }, { "items.productName": { $regex: escapeRegex(ctx.search), $options: "i" } }] }),
      })
        .sort({ adjustmentDate: -1 })
        .limit(MAX_ROWS)
        .lean();
      const costs = new Map(
        (await ProductVariant.find({ _id: { $in: adjustments.flatMap((a) => a.items.map((i) => i.variantId)) } }).select("purchasePrice").lean()).map((v) => [
          String(v._id),
          Number(v.purchasePrice) || 0,
        ]),
      );
      return {
        columns: [
          ["date", "Date", "date"],
          ["type", "Type", "text"],
          ["item", "Item", "text"],
          ["qty", "Quantity", "qty"],
          ["business", "Business", "text"],
          ["loss", "Loss", "money"],
          ["status", "Status", "text"],
        ],
        rows: adjustments.flatMap((a) =>
          a.items.map((i) => ({
            date: a.adjustmentDate,
            type: a.reason ? a.reason[0].toUpperCase() + a.reason.slice(1) : "",
            item: [i.productName, i.variantLabel, i.sku && `(${i.sku})`].filter(Boolean).join(" "),
            qty: i.type === "subtract" ? -i.quantity : i.quantity,
            business: a.locationName || (a.locationType === "WAREHOUSE" ? "Warehouse" : ""),
            loss: i.type === "subtract" ? round(i.quantity * (costs.get(String(i.variantId)) || 0)) : 0,
            status: "Approved",
          })),
        ),
      };
    },
  },
  "salary-report": {
    title: "Salary Report",
    permission: "reports.profitLoss",
    run: async (ctx) => {
      const sheets = await SalarySheet.find({ deletedAt: null, ...range(ctx, "paidDate") }).sort({ year: -1, month: -1 }).lean();
      const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const text = String(ctx.search || "").toLowerCase();
      return {
        columns: [
          ["period", "Month", "text"],
          ["branch", "Branch", "text"],
          ["employee", "Employee", "text"],
          ["designation", "Designation", "text"],
          ["salary", "Salary", "money"],
          ["bonus", "Bonus", "money"],
          ["deduction", "Deduction", "money"],
          ["net", "Net Paid", "money"],
        ],
        rows: sheets
          .flatMap((s) =>
            s.items.map((i) => ({
              period: MONTHS[s.month - 1] + " " + s.year,
              branch: s.branchName,
              employee: i.name,
              designation: i.designation,
              salary: i.salary,
              bonus: i.bonus,
              deduction: i.deduction,
              net: i.net,
            })),
          )
          .filter((r) => !text || r.employee.toLowerCase().includes(text)),
      };
    },
  },
  "sales-commission": {
    title: "Sales Commission",
    permission: "reports.profitLoss",
    run: async (ctx) => {
      const rows = await EmployeeCommission.find({ deletedAt: null, ...range(ctx, "date") })
        .populate("employeeId", "name")
        .sort({ date: -1 })
        .lean();
      return {
        columns: [
          ["date", "Date", "date"],
          ["employee", "Employee", "text"],
          ["type", "Type", "text"],
          ["reference", "For", "text"],
          ["amount", "Amount", "money"],
          ["note", "Note", "text"],
        ],
        rows: rows.map((r) => ({
          date: r.date,
          employee: r.employeeId?.name || "",
          type: r.type === "paid" ? "Paid" : "Given",
          reference: r.reference,
          amount: r.amount,
          note: r.note,
        })),
      };
    },
  },
  "customers-ledger": { title: "Customers Ledger", permission: "reports.due", run: ledgerReport("customer") },
  "suppliers-ledger": { title: "Suppliers Ledger", permission: "reports.due", run: ledgerReport("supplier") },
});

/**
 * Groups as on 360's All Reports page, and the filters each report shows,
 * in order. "dates" is the from/to range; "month" and "year" replace it
 * on the monthly and yearly reports.
 */
const SALES = "Sales Report";
const PARTNER = "Dealer / Sub Dealer / Wholesaler Report";
const META = {
  "master-sales-report": [SALES, ["customer_type", "payment_status", "paid_by", "user", "branch", "search", "dates"]],
  "counter-wise-sale": [SALES, ["branch", "dates"]],
  "stock-report": ["Stock Report", ["location", "brand", "category", "search"]],
  "low-stock-product-report": ["Stock Report", ["location", "category"]],
  "expiry-product-report": ["Stock Report", ["search", "dates"]],
  "stock-adjustments-report": ["Stock Report", ["location", "search", "dates"]],
  "customers-ledger": ["Customer Report", ["customer", "dates"]],
  "salary-report": ["Account Report", ["search", "dates"]],
  "sales-commission": [SALES, ["dates"]],
  "suppliers-ledger": ["Supplier Report", ["supplier", "dates"]],
  "details-sale-profit-loss-report": [SALES, ["customer_type", "branch", "search", "dates"]],
  "detail-sale-report": [SALES, ["customer_type", "user", "branch", "search", "dates"]],
  "payment-schedule-report": [SALES, ["customer_type", "branch", "search", "dates"]],
  "discounts-report": [SALES, ["customer_type", "branch", "search", "dates"]],
  "barcode-wise-sale-report": [SALES, ["customer_type", "branch", "search", "dates"]],
  "monthly-sales-report": [SALES, ["customer_type", "branch", "month"]],
  "yearly-sales-report": [SALES, ["customer_type", "branch", "year"]],
  "daily-sales-report": [SALES, ["customer_type", "branch", "dates"]],
  "employee-sales-report": [SALES, ["customer_type", "branch", "dates"]],
  "showroom-sales-report": [SALES, ["customer_type", "dates"]],
  "customer-type-sales-report": [SALES, ["branch", "dates"]],
  "dealer-sales-report": [PARTNER, ["payment_status", "user", "branch", "search", "dates"]],
  "sub-dealer-sales-report": [PARTNER, ["payment_status", "user", "branch", "search", "dates"]],
  "wholesaler-sales-report": [PARTNER, ["payment_status", "user", "branch", "search", "dates"]],
  "dealer-product-report": [PARTNER, ["branch", "search", "dates"]],
  "sub-dealer-product-report": [PARTNER, ["branch", "search", "dates"]],
  "wholesaler-product-report": [PARTNER, ["branch", "search", "dates"]],
  "dealer-due-report": [PARTNER, ["search"]],
  "sub-dealer-due-report": [PARTNER, ["search"]],
  "wholesaler-due-report": [PARTNER, ["search"]],
  "partner-orders-report": [PARTNER, ["customer_type", "order_status", "search", "dates"]],
  "purchases-report": ["Purchase Report", ["supplier", "payment_status", "search", "dates"]],
  "purchases-order-report": ["Purchase Report", ["supplier", "order_status", "search", "dates"]],
  "purchases-return-report": ["Purchase Report", ["supplier", "search", "dates"]],
  "payable-schedule-report": ["Purchase Report", ["supplier", "search", "dates"]],
  "categories-report": ["Product Report", ["customer_type", "branch", "dates"]],
  "barcode-wise-product-report": ["Product Report", ["category", "brand", "search"]],
  "products-report": ["Product Report", ["category", "brand", "search"]],
  "customers-report": ["Customer Report", ["customer_type", "search"]],
  "customer-due-report": ["Customer Report", ["customer_type", "search"]],
  "suppliers-report": ["Supplier Report", ["search"]],
  "supplier-due-report": ["Supplier Report", ["search"]],
  "expense-report": ["Account Report", ["expense_type", "search", "dates"]],
  "exchange-report": ["Account Report", ["branch", "search", "dates"]],
  "payment-received-report": ["Account Report", ["search", "dates"]],
  "profit-loss-report": ["Profit Loss Report", ["branch", "dates"]],
  "product-wise-profit-loss-report": ["Profit Loss Report", ["customer_type", "branch", "search", "dates"]],
  summary: ["Profit Loss Report", ["branch", "dates"]],
  "vat-report": ["Vat Report", ["customer_type", "branch", "search", "dates"]],
};

for (const [key, [group, filters]] of Object.entries(META)) {
  if (!REPORTS[key]) continue;
  REPORTS[key].group = group;
  REPORTS[key].filters = filters;
}

// the order the All Reports page shows its groups in
export const REPORT_GROUPS = [SALES, PARTNER, "Purchase Report", "Product Report", "Stock Report", "Customer Report", "Supplier Report", "Account Report", "Profit Loss Report", "Vat Report"];

/** Report list for the menu: [key, title, group, dated] */
export const REPORT_LIST = Object.entries(REPORTS).map(([key, r]) => ({
  key,
  title: r.title,
  group: r.group,
  dated: r.dated !== false,
}));

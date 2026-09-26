import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { REPORTS } from "@/lib/reportEngine";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const id = (value) => (mongoose.isValidObjectId(value) ? String(value) : "");
const oneOf = (value, list) => (list.includes(value) ? value : "");

/** yyyy-mm → first and last day of that month */
const monthRange = (month) => {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, "0")}`];
};

/** What each filter's dropdown lists, fetched only for filters the report shows */
async function optionsFor(filters) {
  const db = mongoose.connection.db;
  const list = (collection, query, fields = { name: 1 }) =>
    db.collection(collection).find(query).project(fields).sort({ name: 1 }).toArray();

  const options = {};

  if (filters.includes("branch")) options.branches = await list("showrooms", {});
  if (filters.includes("supplier")) options.suppliers = await list("suppliers", { deletedAt: null });
  if (filters.includes("expense_type")) options.expenseTypes = await list("expensecategories", { deletedAt: null });
  if (filters.includes("category")) options.categories = await list("categories", {});
  if (filters.includes("brand")) {
    options.brands = (await db.collection("products").distinct("brand", { deletedAt: null, brand: { $nin: ["", null] } })).sort();
  }
  if (filters.includes("user")) {
    options.users = (await db.collection("posorders").distinct("soldBy", { soldBy: { $nin: ["", null] } })).sort();
  }

  return options;
}

/**
 * GET /api/reports/run/<key> — any report from the report engine, with
 * the filters it offers: title, columns, rows, totals, filters, options.
 */
export async function GET(req, { params }) {
  try {
    const { key } = await params;
    const report = Object.hasOwn(REPORTS, key) ? REPORTS[key] : null;

    if (!report) {
      return NextResponse.json({ success: false, message: "Unknown report" }, { status: 404 });
    }

    const auth = await requirePermission(report.permission);
    if (auth.response) return auth.response;

    await connectDB();

    const q = new URL(req.url).searchParams;
    const filters = report.filters || ["search", "dates"];

    let from = DAY.test(q.get("from") || "") ? q.get("from") : "";
    let to = DAY.test(q.get("to") || "") ? q.get("to") : "";

    const month = q.get("month") || "";
    const year = q.get("year") || "";

    if (filters.includes("month") && /^\d{4}-\d{2}$/.test(month)) [from, to] = monthRange(month);
    if (filters.includes("year") && /^\d{4}$/.test(year)) [from, to] = [`${year}-01-01`, `${year}-12-31`];

    const { columns, rows } = await report.run({
      from,
      to,
      search: String(q.get("search") || "").trim().slice(0, 100),
      showroomId: id(q.get("showroomId")),
      customerType: oneOf(q.get("customerType"), ["retail", "dealer", "subDealer", "wholesaler"]),
      paymentStatus: oneOf(q.get("paymentStatus"), ["paid", "partial", "due"]),
      orderStatus: oneOf(q.get("orderStatus"), ["pending", "confirmed", "invoiced", "received", "cancelled"]),
      soldBy: String(q.get("soldBy") || "").slice(0, 100),
      supplierId: id(q.get("supplierId")),
      expenseTypeId: id(q.get("expenseTypeId")),
      categoryId: id(q.get("categoryId")),
      brand: String(q.get("brand") || "").slice(0, 100),
    });

    const totals = {};

    if (report.totals !== false) {
      for (const [k, , type] of columns) {
        if (type === "money" || type === "qty") {
          totals[k] = Math.round(rows.reduce((sum, row) => sum + (Number(row[k]) || 0), 0) * 100) / 100;
        }
      }
    }

    return NextResponse.json({
      success: true,
      title: report.title,
      group: report.group,
      filters,
      options: await optionsFor(filters),
      columns,
      rows,
      totals,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

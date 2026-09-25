import { NextResponse } from "next/server";

import SupplierModel from "@/models/Supplier.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { supplierBalances } from "@/lib/supplierService";

const SORTS = {
  created_desc: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  created_asc: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
  due_desc: (a, b) => b.balance.due - a.balance.due,
  due_asc: (a, b) => a.balance.due - b.balance.due,
};

const TOTAL_KEYS = ["total", "paid", "tradeDue", "advance", "dismiss", "received", "due"];

/** Supplier list with every supplier's balance and the totals row */
export async function GET(req) {
  try {
    const auth = await requirePermission("suppliers.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();
    const status = searchParams.get("status") || "all"; // all | active | inactive
    const sort = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "created_desc";
    const start = searchParams.get("start_date");
    const end = searchParams.get("end_date");
    const showAll = searchParams.get("limit") === "all";
    const limit = Math.min(200, Math.max(10, Number(searchParams.get("limit")) || 20));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const filter = { deletedAt: null };

    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      filter.$or = [{ name: pattern }, { companyName: pattern }, { phone: pattern }, { email: pattern }];
    }

    if (start || end) {
      filter.createdAt = {
        ...(start && { $gte: new Date(`${start}T00:00:00`) }),
        ...(end && { $lte: new Date(`${end}T23:59:59.999`) }),
      };
    }

    const suppliers = await SupplierModel.find(filter).lean();
    const balances = await supplierBalances(suppliers);

    const rows = suppliers
      .map((supplier) => ({ ...supplier, balance: balances.get(String(supplier._id)) }))
      .sort(SORTS[sort]);

    const totals = Object.fromEntries(
      TOTAL_KEYS.map((key) => [
        key,
        Math.round(rows.reduce((sum, row) => sum + row.balance[key], 0) * 100) / 100,
      ]),
    );

    const size = showAll ? rows.length || 1 : limit;
    const from = showAll ? 0 : (page - 1) * size;

    return NextResponse.json({
      success: true,
      data: rows.slice(from, from + size),
      totals,
      total: rows.length,
      page: showAll ? 1 : page,
      pages: Math.max(1, Math.ceil(rows.length / size)),
      from: rows.length ? from + 1 : 0,
    });
  } catch (error) {
    console.error("SUPPLIER LIST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load suppliers" },
      { status: 500 },
    );
  }
}

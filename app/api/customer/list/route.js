import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import UserModel from "@/models/User.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";
import { customerBalances } from "@/lib/customerService";

const SORTS = {
  created_desc: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  created_asc: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  name_asc: (a, b) => a.name.localeCompare(b.name),
  name_desc: (a, b) => b.name.localeCompare(a.name),
  due_desc: (a, b) => b.balance.due - a.balance.due,
  due_asc: (a, b) => a.balance.due - b.balance.due,
  sale_desc: (a, b) => b.balance.saleTotal - a.balance.saleTotal,
  recent: (a, b) => new Date(b.balance.lastSale || 0) - new Date(a.balance.lastSale || 0),
};

const TOTAL_KEYS = ["total", "paid", "tradeDue", "advance", "dismiss", "paidOut", "due"];

/**
 * Customer list with every customer's balance, the totals row and how many
 * customers each type (retail, dealer, sub dealer, wholesaler) has.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("customers.due");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();
    const type = searchParams.get("type") || "";
    const status = searchParams.get("status") || "all"; // all | active | inactive
    const dueOnly = searchParams.get("due") === "1";
    const sort = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "created_desc";
    const start = searchParams.get("start_date");
    const end = searchParams.get("end_date");
    const showAll = searchParams.get("limit") === "all";
    const limit = Math.min(200, Math.max(10, Number(searchParams.get("limit")) || 20));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const filter = {};

    // customers saved before isActive existed count as active
    if (status === "active") filter.isActive = { $ne: false };
    if (status === "inactive") filter.isActive = false;

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      filter.$or = [
        { name: pattern },
        { businessName: pattern },
        { phone: pattern },
        { email: pattern },
        { address: pattern },
      ];
    }

    if (start || end) {
      filter.createdAt = {
        ...(start && { $gte: new Date(`${start}T00:00:00`) }),
        ...(end && { $lte: new Date(`${end}T23:59:59.999`) }),
      };
    }

    // the type tabs count everything else the filters match
    const typeCounts = await Customer.aggregate([
      { $match: filter },
      { $group: { _id: { $ifNull: ["$type", "retail"] }, n: { $sum: 1 } } },
    ]);

    if (Object.hasOwn(CUSTOMER_TYPES, type)) {
      // old customers saved before types existed count as retail
      filter.type = type === "retail" ? { $in: ["retail", null] } : type;
    }

    const customers = await Customer.find(filter).lean();

    const [balances, logins] = await Promise.all([
      customerBalances(customers),
      UserModel.find({ customerId: { $in: customers.map((c) => c._id) }, deletedAt: null })
        .select("customerId")
        .lean(),
    ]);
    const withLogin = new Set(logins.map((user) => String(user.customerId)));

    const rows = customers
      .map((customer) => ({
        ...customer,
        type: customer.type || "retail",
        isActive: customer.isActive !== false,
        // a dealer login's type follows its role, so the form locks it
        hasLogin: withLogin.has(String(customer._id)),
        balance: balances.get(String(customer._id)),
      }))
      .filter((row) => !dueOnly || row.balance.due > 0.009)
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
      counts: Object.fromEntries(typeCounts.map((row) => [row._id, row.n])),
      total: rows.length,
      page: showAll ? 1 : page,
      pages: Math.max(1, Math.ceil(rows.length / size)),
      from: rows.length ? from + 1 : 0,
    });
  } catch (error) {
    console.error("CUSTOMER LIST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load customers" },
      { status: 500 },
    );
  }
}

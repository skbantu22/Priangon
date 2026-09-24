import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";
import Customer from "@/models/Customer.model";
import POSOrder from "@/models/posorder.model";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORTS = {
  recent: { updatedAt: -1 },
  name: { name: 1 },
  spent: { totalSpent: -1 },
  orders: { totalOrders: -1 },
};

// Admin customer list (POS buyers, dealers, retailers...) with each one's due
// GET ?q=&type=&sort=&page=&limit=
export async function GET(request) {
  try {
    const auth = await isAuthenticated();
    if (!auth.isAuth || !["admin", "manager"].includes(auth.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
    }

    await connectDB();

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(5, Number(sp.get("limit")) || 20));
    const q = (sp.get("q") || "").trim();
    const type = sp.get("type") || "";
    const sort = SORTS[sp.get("sort")] || SORTS.recent;

    const query = {};
    if (Object.hasOwn(CUSTOMER_TYPES, type)) {
      // old customers saved before types existed count as retail
      query.type = type === "retail" ? { $in: ["retail", null] } : type;
    }
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      query.$or = [{ name: rx }, { phone: rx }, { address: rx }];
    }

    const [customers, total, typeCounts] = await Promise.all([
      Customer.find(query)
        .select("name phone address type totalOrders totalSpent updatedAt")
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query),
      Customer.aggregate([{ $group: { _id: { $ifNull: ["$type", "retail"] }, n: { $sum: 1 } } }]),
    ]);

    // due and last purchase of the customers on this page
    const dues = customers.length
      ? await POSOrder.aggregate([
          { $match: { customerId: { $in: customers.map((c) => c._id) }, status: "completed" } },
          {
            $group: {
              _id: "$customerId",
              due: { $sum: { $ifNull: ["$dueAmount", 0] } },
              lastPurchase: { $max: "$createdAt" },
            },
          },
        ])
      : [];
    const dueMap = new Map(dues.map((d) => [String(d._id), d]));

    const items = customers.map((c) => {
      const d = dueMap.get(String(c._id));
      return {
        _id: c._id,
        name: c.name,
        phone: c.phone || "",
        address: c.address || "",
        type: c.type || "retail",
        totalOrders: c.totalOrders || 0,
        totalSpent: c.totalSpent || 0,
        due: Math.round((d?.due || 0) * 100) / 100,
        lastPurchase: d?.lastPurchase || null,
      };
    });

    const counts = Object.fromEntries(typeCounts.map((t) => [t._id, t.n]));

    return NextResponse.json({ success: true, items, total, page, limit, counts });
  } catch (error) {
    console.error("CUSTOMER LIST ERROR:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

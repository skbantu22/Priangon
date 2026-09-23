import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import PartnerOrder, { PARTNER_ORDER_STATUSES } from "@/models/PartnerOrder.model";

const STAFF = ["admin", "manager", "cashier"];

// GET /api/partner-orders?status=pending  (staff)
export async function GET(req) {
  const auth = await isAuthenticated();
  if (!auth.isAuth || !STAFF.includes(auth.role)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const status = new URL(req.url).searchParams.get("status");
  const filter = PARTNER_ORDER_STATUSES.includes(status) ? { status } : {};

  const [orders, counts] = await Promise.all([
    PartnerOrder.find(filter).sort({ createdAt: -1 }).limit(300).lean(),
    PartnerOrder.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);

  return NextResponse.json({
    success: true,
    orders,
    counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
  });
}

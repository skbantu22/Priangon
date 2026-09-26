import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { connectDB } from "@/lib/databaseconnection";
import { escapeRegex } from "@/lib/escapeRegex";
import PartnerOrder, { PARTNER_ORDER_STATUSES } from "@/models/PartnerOrder.model";

const PARTNER_TYPES = ["dealer", "subDealer", "wholesaler"];

// GET /api/partner-orders?status=pending&type=dealer&search=  (staff)
// Counts come back per status (within the chosen type) and per type
// (within the chosen status), so both rows of tabs can show them.
export async function GET(req) {
  const auth = await requirePermission("partnerOrders.view");
  if (auth.response) return auth.response;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const search = searchParams.get("search")?.trim();

  const byStatus = PARTNER_ORDER_STATUSES.includes(status) ? { status } : {};
  const byType = PARTNER_TYPES.includes(type) ? { customerType: type } : {};
  const bySearch = search
    ? {
        $or: ["orderNumber", "customerName", "phone", "invoiceNumber"].map((field) => ({
          [field]: { $regex: escapeRegex(search), $options: "i" },
        })),
      }
    : {};

  const [orders, statusCounts, typeCounts] = await Promise.all([
    PartnerOrder.find({ ...byStatus, ...byType, ...bySearch }).sort({ createdAt: -1 }).limit(300).lean(),
    PartnerOrder.aggregate([{ $match: { ...byType, ...bySearch } }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
    PartnerOrder.aggregate([{ $match: { ...byStatus, ...bySearch } }, { $group: { _id: "$customerType", n: { $sum: 1 } } }]),
  ]);

  return NextResponse.json({
    success: true,
    orders,
    counts: Object.fromEntries(statusCounts.map((c) => [c._id, c.n])),
    typeCounts: Object.fromEntries(typeCounts.map((c) => [c._id, c.n])),
  });
}

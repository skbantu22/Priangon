import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import RepairJob from "@/models/RepairJob.model";

const day = (value, end) => {
  const d = value ? new Date(`${value}T00:00:00`) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  if (end) d.setDate(d.getDate() + 1);
  return d;
};

/**
 * Repair income for a shop and a date range.
 *
 * Income = jobs handed back (delivered) in the range: service charge plus the
 * parts charged. Jobs taken in and the money owed on them are counted from the
 * jobs received in the range.
 */
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();
    const sp = new URL(req.url).searchParams;

    const shop = sp.get("showroomId") || "";
    const scope = { deletedAt: null };
    if (shop === "warehouse") scope.showroomId = null;
    else if (mongoose.isValidObjectId(shop)) scope.showroomId = new mongoose.Types.ObjectId(shop);

    const from = day(sp.get("start"), false);
    const to = day(sp.get("end"), true);
    const range = (field) =>
      from || to ? { [field]: { ...(from && { $gte: from }), ...(to && { $lt: to }) } } : {};

    const delivered = { ...scope, status: "delivered", ...range("deliveredAt") };

    const [totals, received, perTech, jobs] = await Promise.all([
      RepairJob.aggregate([
        { $match: delivered },
        {
          $group: {
            _id: null,
            jobs: { $sum: 1 },
            total: { $sum: "$total" },
            serviceCharge: { $sum: "$serviceCharge" },
            parts: { $sum: { $subtract: ["$total", "$serviceCharge"] } },
            paid: { $sum: "$paid" },
            due: { $sum: "$due" },
          },
        },
      ]),
      RepairJob.aggregate([
        { $match: { ...scope, ...range("receivedAt") } },
        {
          $group: {
            _id: "$status",
            n: { $sum: 1 },
            due: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$due", 0] } },
          },
        },
      ]),
      RepairJob.aggregate([
        { $match: delivered },
        {
          $group: {
            _id: { $cond: [{ $eq: ["$technicianName", ""] }, "No technician", "$technicianName"] },
            jobs: { $sum: 1 },
            total: { $sum: "$total" },
          },
        },
        { $sort: { total: -1 } },
      ]),
      RepairJob.find(delivered)
        .sort({ deliveredAt: -1 })
        .limit(500)
        .select("jobNumber customerName device technicianName serviceCharge total paid due deliveredAt")
        .lean(),
    ]);

    const t = totals[0] || {};
    return NextResponse.json({
      success: true,
      income: {
        jobs: t.jobs || 0,
        total: t.total || 0,
        serviceCharge: t.serviceCharge || 0,
        parts: t.parts || 0,
        paid: t.paid || 0,
        due: t.due || 0,
      },
      received: Object.fromEntries(received.map((r) => [r._id, { n: r.n, due: r.due }])),
      technicians: perTech.map((x) => ({ name: x._id, jobs: x.jobs, total: x.total })),
      jobs,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

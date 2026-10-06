import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import { escapeRegex } from "@/lib/escapeRegex";
import { longNumber } from "@/lib/documentNumber";
import { readRepair } from "@/lib/repairService";
import RepairJob, { REPAIR_STATUSES } from "@/models/RepairJob.model";

const STAFF = ["admin", "manager", "cashier"];

const staffOnly = async () => {
  const auth = await isAuthenticated();
  return auth.isAuth && STAFF.includes(auth.role) ? auth : null;
};

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

// a shop id, "warehouse" (no shop) or empty (every shop)
const shopFilter = (value) => {
  if (value === "warehouse") return { showroomId: null };
  if (mongoose.isValidObjectId(value)) return { showroomId: new mongoose.Types.ObjectId(value) };
  return {};
};

// GET /api/repair?showroomId=&status=&search=
export async function GET(req) {
  if (!(await staffOnly())) return unauthorized();

  try {
    await connectDB();
    const sp = new URL(req.url).searchParams;
    const scope = { deletedAt: null, ...shopFilter(sp.get("showroomId") || "") };

    const filter = { ...scope };
    const status = sp.get("status");
    if (REPAIR_STATUSES.includes(status)) filter.status = status;
    const search = String(sp.get("search") || "").trim();
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ customerName: rx }, { phone: rx }, { device: rx }, { imei: rx }, { jobNumber: rx }];
    }

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [jobs, counts, money] = await Promise.all([
      RepairJob.find(filter).sort({ createdAt: -1 }).limit(300).lean(),
      RepairJob.aggregate([{ $match: scope }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
      RepairJob.aggregate([
        { $match: scope },
        {
          $group: {
            _id: null,
            // owed on jobs that are not cancelled
            due: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$due", 0] } },
            todayIn: { $sum: { $cond: [{ $gte: ["$receivedAt", dayStart] }, 1, 0] } },
            todayEarned: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ["$status", "delivered"] }, { $gte: ["$deliveredAt", dayStart] }] },
                  "$total",
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      jobs,
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
      summary: {
        due: money[0]?.due || 0,
        todayIn: money[0]?.todayIn || 0,
        todayEarned: money[0]?.todayEarned || 0,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST a new repair job
export async function POST(req) {
  const auth = await staffOnly();
  if (!auth) return unauthorized();

  try {
    await connectDB();
    const body = await req.json();
    const { data, error } = readRepair(body);
    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 });

    const job = await RepairJob.create({
      ...data,
      jobNumber: longNumber(),
      showroomId: mongoose.isValidObjectId(body.showroomId) ? body.showroomId : null,
      receivedBy: String(body.receivedBy || "").trim().slice(0, 120),
      deliveredAt: data.status === "delivered" ? new Date() : null,
    });

    return NextResponse.json({ success: true, message: `Job ${job.jobNumber} added`, job });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { isAuthenticated } from "@/lib/auth.server";
import { readRepair } from "@/lib/repairService";
import RepairJob from "@/models/RepairJob.model";

const STAFF = ["admin", "manager", "cashier"];

const guard = async (params) => {
  const auth = await isAuthenticated();
  if (!auth.isAuth || !STAFF.includes(auth.role)) {
    return { response: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 }) };
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return { response: NextResponse.json({ success: false, message: "Job not found" }, { status: 404 }) };
  }
  return { id, auth };
};

export async function GET(_req, { params }) {
  const g = await guard(params);
  if (g.response) return g.response;
  await connectDB();
  const job = await RepairJob.findOne({ _id: g.id, deletedAt: null }).lean();
  if (!job) return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 });
  return NextResponse.json({ success: true, job });
}

// PUT the whole job (the edit form), or just { status } from the quick buttons
export async function PUT(req, { params }) {
  const g = await guard(params);
  if (g.response) return g.response;

  try {
    await connectDB();
    const job = await RepairJob.findOne({ _id: g.id, deletedAt: null });
    if (!job) return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 });

    const body = await req.json();
    // a bare status change keeps everything else as it is
    const merged = Object.keys(body).length === 1 && body.status
      ? { ...job.toObject(), status: body.status }
      : body;

    const { data, error } = readRepair(merged);
    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 });

    const wasDelivered = job.status === "delivered";
    job.set(data);
    if (data.status === "delivered" && !wasDelivered) job.deliveredAt = new Date();
    if (data.status !== "delivered") job.deliveredAt = null;
    await job.save();

    return NextResponse.json({ success: true, message: "Job updated", job });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

// deleting only stamps deletedAt
export async function DELETE(_req, { params }) {
  const g = await guard(params);
  if (g.response) return g.response;
  await connectDB();
  const job = await RepairJob.findOneAndUpdate({ _id: g.id, deletedAt: null }, { deletedAt: new Date() });
  if (!job) return NextResponse.json({ success: false, message: "Job not found" }, { status: 404 });
  return NextResponse.json({ success: true, message: "Job removed" });
}

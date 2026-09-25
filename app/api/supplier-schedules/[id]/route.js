import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SupplierSchedule from "@/models/SupplierSchedule.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { readSchedule } from "@/lib/supplierService";

const notFound = () =>
  NextResponse.json({ success: false, message: "Schedule not found" }, { status: 404 });

async function load(params) {
  const auth = await requirePermission("suppliers.manage");
  if (auth.response) return { response: auth.response };

  await connectDB();

  const { id } = await params;

  const schedule = mongoose.isValidObjectId(id) ? await SupplierSchedule.findById(id) : null;

  return schedule ? { schedule } : { response: notFound() };
}

export async function PUT(req, { params }) {
  try {
    const { schedule, response } = await load(params);
    if (response) return response;

    const checked = await readSchedule(await req.json());

    if (checked.error) {
      return NextResponse.json({ success: false, message: checked.error }, { status: 400 });
    }

    Object.assign(schedule, checked.data);
    await schedule.save();

    return NextResponse.json({ success: true, message: "Schedule updated", data: schedule });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Marks a schedule done, or moves it back to pending */
export async function PATCH(req, { params }) {
  try {
    const { schedule, response } = await load(params);
    if (response) return response;

    const { status } = await req.json();

    schedule.status = status === "done" ? "done" : "pending";
    schedule.doneAt = schedule.status === "done" ? new Date() : null;
    await schedule.save();

    return NextResponse.json({
      success: true,
      message: schedule.status === "done" ? "Marked as done" : "Moved back to pending",
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { schedule, response } = await load(params);
    if (response) return response;

    await schedule.deleteOne();

    return NextResponse.json({ success: true, message: "Schedule deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

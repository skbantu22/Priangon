import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Attendance from "@/models/Attendance.model";
import Employee from "@/models/Employee.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { ATTENDANCE_STATUSES, employeeScope, isDayKey, todayKey } from "@/lib/attendance";

/**
 * GET ?date=YYYY-MM-DD&showroomId=  every active employee with their mark for that day
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("employees.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || todayKey();
    if (!isDayKey(date)) {
      return NextResponse.json({ success: false, message: "Pick a valid date" }, { status: 400 });
    }

    const employees = await Employee.find({ deletedAt: null, isActive: true, ...employeeScope(searchParams.get("showroomId")) })
      .select("name designation mobile picture salary joiningDate showroomId")
      .sort({ name: 1 })
      .lean();

    const marks = await Attendance.find({ date, employeeId: { $in: employees.map((e) => e._id) } })
      .select("employeeId status note")
      .lean();
    const markBy = new Map(marks.map((m) => [String(m.employeeId), m]));

    const data = employees.map((e) => ({
      _id: String(e._id),
      name: e.name,
      designation: e.designation,
      mobile: e.mobile,
      picture: e.picture?.url || "",
      status: markBy.get(String(e._id))?.status || "",
      note: markBy.get(String(e._id))?.note || "",
    }));

    const counts = { present: 0, absent: 0, half: 0, leave: 0, unmarked: 0 };
    for (const row of data) counts[row.status || "unmarked"] += 1;

    return NextResponse.json({ success: true, date, data, counts });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST { date, entries: [{ employeeId, status, note? }] }
 * status is present / absent / half / leave, or "clear" to take the mark off.
 */
export async function POST(req) {
  try {
    const auth = await requirePermission("employees.attendance");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const date = String(body.date || "");

    if (!isDayKey(date)) {
      return NextResponse.json({ success: false, message: "Pick a valid date" }, { status: 400 });
    }
    if (date > todayKey()) {
      return NextResponse.json({ success: false, message: "Attendance cannot be marked for a day that has not come yet" }, { status: 400 });
    }

    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (!entries.length) {
      return NextResponse.json({ success: false, message: "Nothing to save" }, { status: 400 });
    }

    const ids = entries.map((e) => e?.employeeId).filter((id) => mongoose.isValidObjectId(id));
    const known = new Set(
      (await Employee.find({ _id: { $in: ids }, deletedAt: null }).select("_id").lean()).map((e) => String(e._id)),
    );

    const markedBy = await actorFullName(auth);
    const writes = [];

    for (const entry of entries) {
      const id = String(entry?.employeeId || "");
      if (!known.has(id)) continue;

      if (entry.status === "clear") {
        writes.push({ deleteOne: { filter: { employeeId: id, date } } });
        continue;
      }
      if (!ATTENDANCE_STATUSES.includes(entry.status)) continue;

      writes.push({
        updateOne: {
          filter: { employeeId: id, date },
          update: {
            $set: { status: entry.status, note: String(entry.note || "").trim().slice(0, 300), markedBy },
            $setOnInsert: { employeeId: id, date },
          },
          upsert: true,
        },
      });
    }

    if (!writes.length) {
      return NextResponse.json({ success: false, message: "No valid employee to save" }, { status: 400 });
    }

    await Attendance.bulkWrite(writes, { ordered: false });

    return NextResponse.json({ success: true, message: "Attendance saved", saved: writes.length });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

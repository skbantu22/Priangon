import mongoose from "mongoose";
import { NextResponse } from "next/server";

import ActivityLog from "@/models/ActivityLog.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

/** One activity with what changed: { old, new } */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("activity.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const log = mongoose.isValidObjectId(id) ? await ActivityLog.findById(id).lean() : null;

    if (!log) {
      return NextResponse.json({ success: false, message: "Activity not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

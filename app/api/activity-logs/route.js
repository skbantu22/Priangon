import mongoose from "mongoose";
import { NextResponse } from "next/server";

import ActivityLog from "@/models/ActivityLog.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";

const TZ = "+06:00";

/**
 * Activity Log list: who created, changed or deleted what. The changes
 * themselves stay out of the list (a created sale carries the whole
 * invoice); the detail route returns them.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("activity.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = {};

    const userId = searchParams.get("userId");
    if (mongoose.isValidObjectId(userId)) filter.userId = new mongoose.Types.ObjectId(userId);

    const moduleName = searchParams.get("module");
    if (moduleName) filter.module = moduleName;

    const action = searchParams.get("action");
    if (["created", "updated", "deleted"].includes(action)) filter.action = action;

    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(`${from}T00:00:00${TZ}`);
      if (to) filter.createdAt.$lte = new Date(`${to}T23:59:59.999${TZ}`);
    }

    const search = searchParams.get("search")?.trim();
    if (search) {
      const regex = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ label: regex }, { module: regex }, { userName: regex }];
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 25));

    const [rows, total, modules, users] = await Promise.all([
      ActivityLog.find(filter)
        .select("-changes")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
      ActivityLog.distinct("module"),
      ActivityLog.aggregate([
        { $match: { userId: { $ne: null } } },
        { $group: { _id: "$userId", name: { $last: "$userName" } } },
        { $sort: { name: 1 } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: rows,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      from: total ? (page - 1) * limit + 1 : 0,
      hasMore: page * limit < total,
      modules: modules.sort(),
      users: users.map((u) => ({ _id: u._id, name: u.name || "—" })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

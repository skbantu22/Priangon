import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { TRASH_RETENTION_DAYS, daysLeft, purgeAt } from "@/lib/trash";
import { branchFilter, purgeExpiredTrash, trashType } from "@/lib/trash.server";

const PURGE_EVERY = 6 * 60 * 60 * 1000;

let lastPurge = 0;

/**
 * Opening the trash is also when the 30 day sweep gets a chance to run.
 *
 * The scheduled job at /api/trash/purge is the real clock, but a shop
 * without one still never sees a row older than the window, and the
 * six hour gate keeps it off the hot path.
 */
async function sweep() {
  if (Date.now() - lastPurge < PURGE_EVERY) return;

  lastPurge = Date.now();

  try {
    await purgeExpiredTrash();
  } catch {
    // a failed sweep must not take the trash list down with it
    lastPurge = 0;
  }
}

/** One page of a trash tab */
export async function GET(request) {
  try {
    const auth = await requirePermission("trash.view");
    if (auth.response) return auth.response;

    await connectDB();

    const sp = request.nextUrl.searchParams;
    const type = trashType(sp.get("type"));

    if (!type) {
      return NextResponse.json({ success: false, message: "Unknown trash type" }, { status: 400 });
    }

    await sweep();

    const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "20", 10)));
    const search = (sp.get("search") || "").trim();

    const query = {
      ...(type.filter || {}),
      ...branchFilter(type, sp.get("branch")),
      deletedAt: { $ne: null },
    };

    if (search) {
      query.$or = type.search.map((field) => ({
        [field]: { $regex: escapeRegex(search), $options: "i" },
      }));
    }

    const [docs, total] = await Promise.all([
      type
        .model()
        .find(query)
        .select(type.select)
        .sort({ deletedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      type.model().countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: docs.map((doc) => ({
        _id: String(doc._id),
        ...type.row(doc),
        deletedAt: doc.deletedAt,
        purgeAt: purgeAt(doc.deletedAt),
        daysLeft: daysLeft(doc.deletedAt),
      })),
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      from: total === 0 ? 0 : (page - 1) * limit + 1,
      retentionDays: TRASH_RETENTION_DAYS,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Restore rows back to their list, or wipe them for good */
export async function POST(request) {
  try {
    const auth = await requirePermission("trash.restore");
    if (auth.response) return auth.response;

    await connectDB();

    const { type: key, ids = [], action, branch } = await request.json();
    const type = trashType(key);

    if (!type) {
      return NextResponse.json({ success: false, message: "Unknown trash type" }, { status: 400 });
    }

    if (!["restore", "delete"].includes(action)) {
      return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
    }

    const valid = ids.filter((id) => mongoose.isValidObjectId(id));

    if (valid.length === 0) {
      return NextResponse.json({ success: false, message: "Nothing selected" }, { status: 400 });
    }

    // deletedAt in the filter keeps either action from touching a live row
    const scope = {
      ...(type.filter || {}),
      ...branchFilter(type, branch),
      _id: { $in: valid },
      deletedAt: { $ne: null },
    };

    if (action === "restore") {
      const result = await type.model().updateMany(scope, { $set: { deletedAt: null } });

      return NextResponse.json({
        success: true,
        message: `${result.modifiedCount} restored`,
        count: result.modifiedCount,
      });
    }

    const result = await type.model().deleteMany(scope);

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} deleted permanently`,
      count: result.deletedCount,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

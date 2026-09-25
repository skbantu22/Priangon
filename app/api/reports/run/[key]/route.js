import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { REPORTS } from "@/lib/reportEngine";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/reports/run/<key>?from&to&search&showroomId — any report from
 * the report engine: its title, columns, rows and the column totals.
 */
export async function GET(req, { params }) {
  try {
    const { key } = await params;
    const report = Object.hasOwn(REPORTS, key) ? REPORTS[key] : null;

    if (!report) {
      return NextResponse.json({ success: false, message: "Unknown report" }, { status: 404 });
    }

    const auth = await requirePermission(report.permission);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const showroomId = searchParams.get("showroomId");

    const { columns, rows } = await report.run({
      from: DAY.test(from || "") ? from : "",
      to: DAY.test(to || "") ? to : "",
      search: String(searchParams.get("search") || "").trim().slice(0, 100),
      showroomId: mongoose.isValidObjectId(showroomId) ? showroomId : "",
    });

    const totals = {};

    if (report.totals !== false) {
      for (const [k, , type] of columns) {
        if (type === "money" || type === "qty") {
          totals[k] = Math.round(rows.reduce((sum, row) => sum + (Number(row[k]) || 0), 0) * 100) / 100;
        }
      }
    }

    return NextResponse.json({
      success: true,
      title: report.title,
      group: report.group,
      dated: report.dated !== false,
      columns,
      rows,
      totals,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

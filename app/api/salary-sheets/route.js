import { NextResponse } from "next/server";

import SalarySheet from "@/models/SalarySheet.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { createSalarySheet, salaryDraft } from "@/lib/employeeService";

/**
 * GET ?draft=1&year&month&showroomId — the sheet to fill (active employees)
 * GET — every salary paid, newest month first
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("employees.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    if (searchParams.get("draft")) {
      const draft = await salaryDraft({
        year: Number(searchParams.get("year")),
        month: Number(searchParams.get("month")),
        showroomId: searchParams.get("showroomId"),
      });
      return NextResponse.json({ success: true, ...draft });
    }

    const sheets = await SalarySheet.find({ deletedAt: null })
      .select("-items.note")
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: sheets.map((s) => ({ ...s, count: s.items.length, items: undefined })),
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("employees.salary");
    if (auth.response) return auth.response;

    await connectDB();

    let sheet;
    try {
      sheet = await createSalarySheet(await req.json(), await actorFullName(auth));
    } catch (formError) {
      return NextResponse.json({ success: false, message: formError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Salary paid", data: sheet }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

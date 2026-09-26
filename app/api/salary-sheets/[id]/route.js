import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SalarySheet from "@/models/SalarySheet.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

async function find(params) {
  const { id } = await params;
  return mongoose.isValidObjectId(id) ? SalarySheet.findOne({ _id: id, deletedAt: null }) : null;
}

const notFound = () => NextResponse.json({ success: false, message: "Salary sheet not found" }, { status: 404 });

export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("employees.view");
    if (auth.response) return auth.response;

    await connectDB();

    const sheet = await find(params);
    if (!sheet) return notFound();

    return NextResponse.json({ success: true, data: sheet });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Only to correct a mistake: the month can then be paid again */
export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("employees.salary");
    if (auth.response) return auth.response;

    await connectDB();

    const sheet = await find(params);
    if (!sheet) return notFound();

    sheet.deletedAt = new Date();
    await sheet.save();

    return NextResponse.json({ success: true, message: "Salary sheet deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

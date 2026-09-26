import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Employee from "@/models/Employee.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { readEmployee } from "@/lib/employeeService";

/** Employee List: everyone on the payroll, with the branch they work at */
export async function GET(req) {
  try {
    const auth = await requirePermission("employees.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = { deletedAt: null };

    const showroomId = searchParams.get("showroomId");
    if (showroomId === "head") filter.showroomId = null;
    else if (mongoose.isValidObjectId(showroomId)) filter.showroomId = showroomId;

    const status = searchParams.get("status");
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const search = searchParams.get("search")?.trim();
    if (search) {
      const regex = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ name: regex }, { mobile: regex }, { designation: regex }, { email: regex }];
    }

    const employees = await Employee.find(filter).populate("showroomId", "name").sort({ name: 1 }).lean();

    return NextResponse.json({ success: true, data: employees });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("employees.manage");
    if (auth.response) return auth.response;

    await connectDB();

    const { data, error } = await readEmployee(await req.json());
    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 });

    const employee = await Employee.create(data);

    return NextResponse.json({ success: true, message: `${employee.name} added`, data: employee }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

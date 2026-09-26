import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Employee from "@/models/Employee.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { readEmployee } from "@/lib/employeeService";

async function load(params, permission) {
  const auth = await requirePermission(permission);
  if (auth.response) return { response: auth.response };

  await connectDB();

  const { id } = await params;
  const employee = mongoose.isValidObjectId(id) ? await Employee.findOne({ _id: id, deletedAt: null }) : null;

  if (!employee) {
    return { response: NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 }) };
  }

  return { employee };
}

export async function GET(req, { params }) {
  try {
    const { employee, response } = await load(params, "employees.view");
    if (response) return response;
    return NextResponse.json({ success: true, data: employee });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { employee, response } = await load(params, "employees.manage");
    if (response) return response;

    const { data, error } = await readEmployee(await req.json());
    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 });

    Object.assign(employee, data);
    await employee.save();

    return NextResponse.json({ success: true, message: `${employee.name} updated`, data: employee });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** PATCH { isActive } — an inactive employee is left off new salary sheets */
export async function PATCH(req, { params }) {
  try {
    const { employee, response } = await load(params, "employees.manage");
    if (response) return response;

    const { isActive } = await req.json();
    employee.isActive = Boolean(isActive);
    await employee.save();

    return NextResponse.json({ success: true, message: `${employee.name} is now ${employee.isActive ? "active" : "inactive"}` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Soft delete: paid salary and commission keep the name they were paid under */
export async function DELETE(req, { params }) {
  try {
    const { employee, response } = await load(params, "employees.manage");
    if (response) return response;

    employee.deletedAt = new Date();
    await employee.save();

    return NextResponse.json({ success: true, message: `${employee.name} deleted` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

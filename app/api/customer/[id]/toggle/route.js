import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

/** Switches a customer between active and inactive */
export async function POST(req, { params }) {
  try {
    const auth = await requirePermission("customers.edit");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const customer = mongoose.isValidObjectId(id) ? await Customer.findById(id) : null;

    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }

    customer.isActive = customer.isActive === false;
    await customer.save();

    return NextResponse.json({
      success: true,
      message: customer.isActive ? "Customer activated" : "Customer deactivated",
      data: { isActive: customer.isActive },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

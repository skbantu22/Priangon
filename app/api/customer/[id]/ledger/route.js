import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { customerLedger } from "@/lib/customerService";

/** The customer's account statement, optionally for a date range */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("customers.due");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const customer = mongoose.isValidObjectId(id) ? await Customer.findById(id).lean() : null;

    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);

    const ledger = await customerLedger(customer, {
      start: searchParams.get("start_date") || "",
      end: searchParams.get("end_date") || "",
    });

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          _id: String(customer._id),
          name: customer.name,
          businessName: customer.businessName || "",
          phone: customer.phone,
          address: customer.address,
          type: customer.type || "retail",
        },
        ...ledger,
      },
    });
  } catch (error) {
    console.error("CUSTOMER LEDGER ERROR:", error);

    return NextResponse.json({ success: false, message: "Could not load ledger" }, { status: 500 });
  }
}

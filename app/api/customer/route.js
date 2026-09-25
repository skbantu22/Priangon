import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { normalizeCustomerType } from "@/lib/priceTiers";
import { readCustomer } from "@/lib/customerService";

/**
 * Admin "Add New Customer". Unlike the POS quick-add, a phone that is
 * already on file is refused, so an opening due is never written over
 * someone else's account.
 */
export async function POST(req) {
  try {
    const auth = await requirePermission("customers.create");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const { data, error } = readCustomer(body);

    if (error) return NextResponse.json({ success: false, message: error }, { status: 400 });

    const existing = await Customer.findOne({ phone: data.phone }).select("name").lean();

    if (existing) {
      return NextResponse.json(
        { success: false, message: `${data.phone} already belongs to ${existing.name}` },
        { status: 409 },
      );
    }

    const customer = await Customer.create({ ...data, type: normalizeCustomerType(body.type) });

    return NextResponse.json({ success: true, message: "Customer added", data: customer });
  } catch (error) {
    console.error("CUSTOMER CREATE ERROR:", error);

    return NextResponse.json({ success: false, message: "Could not save customer" }, { status: 500 });
  }
}

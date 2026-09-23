import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { normalizeCustomerType } from "@/lib/priceTiers";
import Customer from "@/models/Customer.model";

// POS "add customer": creates the customer, or updates the one that already
// has this phone (so re-adding someone as a dealer just changes their type)
export async function POST(req) {
  try {
    const auth = await isAuthenticated();
    if (!auth.isAuth || !["admin", "manager", "cashier"].includes(auth.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 80);
    const phone = String(body.phone || "").replace(/[\s-]/g, "");
    const address = String(body.address || "").trim().slice(0, 200);
    const type = normalizeCustomerType(body.type);

    if (name.length < 2) {
      return NextResponse.json({ success: false, message: "Enter the customer's name" }, { status: 400 });
    }
    if (!/^01\d{9}$/.test(phone)) {
      return NextResponse.json({ success: false, message: "Phone must be 01XXXXXXXXX" }, { status: 400 });
    }

    await connectDB();

    const existed = await Customer.exists({ phone });
    const customer = await Customer.findOneAndUpdate(
      { phone },
      { $set: { name, address, type }, $setOnInsert: { phone } },
      { new: true, upsert: true, runValidators: true },
    )
      .select("name phone address type totalOrders totalSpent")
      .lean();

    return NextResponse.json({
      success: true,
      message: existed ? "Customer updated" : "Customer added",
      customer,
    });
  } catch (error) {
    console.error("CUSTOMER CREATE ERROR:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

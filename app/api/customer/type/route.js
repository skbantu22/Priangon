import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import UserModel from "@/models/User.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { CUSTOMER_TYPES } from "@/lib/priceTiers";

/**
 * Moves the selected customers to one type (Retail, Dealer, Sub Dealer,
 * Wholesaler), which is the rate the POS charges them. Customers with a
 * dealer login are skipped: their type follows the login's role.
 *
 * POST { ids: [], type }
 */
export async function POST(req) {
  try {
    const auth = await requirePermission("customers.edit");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const type = body.type;
    const ids = (Array.isArray(body.ids) ? body.ids : []).filter((id) => mongoose.isValidObjectId(id));

    if (!Object.hasOwn(CUSTOMER_TYPES, type)) {
      return NextResponse.json({ success: false, message: "Choose a customer type" }, { status: 400 });
    }

    if (!ids.length) {
      return NextResponse.json({ success: false, message: "Select customers first" }, { status: 400 });
    }

    const withLogin = await UserModel.find({ customerId: { $in: ids }, deletedAt: null })
      .select("customerId")
      .lean();
    const locked = new Set(withLogin.map((user) => String(user.customerId)));
    const free = ids.filter((id) => !locked.has(String(id)));

    const result = free.length
      ? await Customer.updateMany({ _id: { $in: free } }, { $set: { type } })
      : { modifiedCount: 0 };

    const label = CUSTOMER_TYPES[type].short;
    const skipped = ids.length - free.length;

    return NextResponse.json({
      success: true,
      message:
        `${result.modifiedCount} customer(s) moved to ${label}` +
        (skipped ? `; ${skipped} with a dealer login left as they are` : ""),
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

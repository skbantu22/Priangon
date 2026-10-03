import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { PARTNER_ROLES, normalizeCustomerType } from "@/lib/priceTiers";
import { createPartnerLogin } from "@/lib/partnerLogin";
import UserModel from "@/models/User.model";
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

    const existing = await Customer.findOne({ phone: data.phone })
      .select("name deletedAt")
      .lean();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          // the number is unique across the trash too, so say where it went
          message: existing.deletedAt
            ? `${data.phone} belongs to ${existing.name}, who is in the trash. Restore them instead.`
            : `${data.phone} already belongs to ${existing.name}`,
        },
        { status: 409 },
      );
    }

    // a dealer, sub dealer or wholesaler also gets a portal login: their
    // mobile number and a password
    const type = normalizeCustomerType(body.type);
    const password = String(body.password || "").trim();
    const isPartner = PARTNER_ROLES.includes(type);
    if (isPartner) {
      if (password.length < 4) {
        return NextResponse.json({ success: false, message: "Set a login password of at least 4 characters" }, { status: 400 });
      }
      if (await UserModel.exists({ phone: data.phone, deletedAt: null })) {
        return NextResponse.json({ success: false, message: `${data.phone} already has a login` }, { status: 409 });
      }
    }

    const customer = await Customer.create({ ...data, type });

    if (isPartner) {
      try {
        await createPartnerLogin({
          customer,
          name: data.name,
          phone: data.phone,
          address: data.address,
          email: data.email,
          password,
          role: type,
        });
      } catch (loginError) {
        // no customer without the login they were asked to get
        await Customer.deleteOne({ _id: customer._id });
        throw loginError;
      }
    }

    return NextResponse.json({
      success: true,
      message: isPartner ? `Customer added · login made (${data.phone})` : "Customer added",
      data: customer,
    });
  } catch (error) {
    console.error("CUSTOMER CREATE ERROR:", error);

    return NextResponse.json({ success: false, message: "Could not save customer" }, { status: 500 });
  }
}

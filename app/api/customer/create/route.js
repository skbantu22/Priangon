import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { PARTNER_ROLES, normalizeCustomerType } from "@/lib/priceTiers";
import { standInEmail } from "@/lib/mobileLogin";
import Customer from "@/models/Customer.model";
import UserModel from "@/models/User.model";

// POS "add customer": creates the customer, or updates the one that already
// has this phone (so re-adding someone as a dealer just changes their type).
// A dealer, sub dealer or wholesaler also gets a portal login, the mobile
// number and a password; a normal buyer gets none.
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
    const password = String(body.password || "").trim();

    if (name.length < 2) {
      return NextResponse.json({ success: false, message: "Enter the customer's name" }, { status: 400 });
    }
    if (!/^01\d{9}$/.test(phone)) {
      return NextResponse.json({ success: false, message: "Phone must be 01XXXXXXXXX" }, { status: 400 });
    }
    // a dealer, sub dealer or wholesaler gets a portal login (their mobile
    // number is the username); a normal buyer needs no password
    const isPartner = PARTNER_ROLES.includes(type);

    await connectDB();

    const existingLogin = isPartner ? await UserModel.findOne({ phone, deletedAt: null }).select("_id customerId role") : null;
    if (isPartner && !existingLogin && password.length < 4) {
      return NextResponse.json({ success: false, message: "Set a password of at least 4 characters for the login" }, { status: 400 });
    }
    if (password && password.length < 4) {
      return NextResponse.json({ success: false, message: "The password needs at least 4 characters" }, { status: 400 });
    }
    if (existingLogin && !PARTNER_ROLES.includes(existingLogin.role)) {
      return NextResponse.json({ success: false, message: "This mobile number is a staff login already" }, { status: 409 });
    }

    // a blank photo leaves the current one as it is
    const photo = String(body.photo || "").trim().slice(0, 500);

    const existed = await Customer.exists({ phone });
    const customer = await Customer.findOneAndUpdate(
      { phone },
      { $set: { name, address, type, ...(photo && { photo }) }, $setOnInsert: { phone } },
      { new: true, upsert: true, runValidators: true },
    )
      .select("name phone address photo type totalOrders totalSpent")
      .lean();

    // the partner's login: made, or moved to the new type (and password)
    let loginNote = "";
    if (isPartner) {
      if (existingLogin) {
        const login = await UserModel.findById(existingLogin._id);
        login.name = name;
        login.role = type;
        login.customerId = customer._id;
        login.address = address;
        if (password) {
          login.password = password;
          login.tokenVersion = (login.tokenVersion || 0) + 1;
        }
        await login.save();
        loginNote = password ? " · login password changed" : "";
      } else {
        await UserModel.create({
          name,
          email: standInEmail(phone),
          password,
          role: type,
          customerId: customer._id,
          phone,
          address,
          isEmailVerified: true,
        });
        loginNote = ` · login made (${phone})`;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${existed ? "Customer updated" : "Customer added"}${loginNote}`,
      customer,
    });
  } catch (error) {
    console.error("CUSTOMER CREATE ERROR:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { CUSTOMER_TYPES, isPartnerRole, PARTNER_ROLES } from "@/lib/priceTiers";
import UserModel from "@/models/User.model";
import Customer from "@/models/Customer.model";
import POSOrder from "@/models/posorder.model";

const adminOnly = async () => {
  const auth = await isAuthenticated("admin");
  return auth.isAuth;
};
const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

// GET: all dealer / sub dealer / retailer logins with their balance
export async function GET() {
  if (!(await adminOnly())) return fail("Unauthorized", 403);
  await connectDB();

  const users = await UserModel.find({ role: { $in: PARTNER_ROLES }, deletedAt: null })
    .select("name email role customerId createdAt")
    .sort({ createdAt: -1 })
    .lean();
  const customerIds = users.map((u) => u.customerId).filter(Boolean);

  const [customers, balances] = await Promise.all([
    Customer.find({ _id: { $in: customerIds } }).lean(),
    POSOrder.aggregate([
      { $match: { customerId: { $in: customerIds }, status: "completed" } },
      {
        $group: {
          _id: "$customerId",
          invoices: { $sum: 1 },
          spent: { $sum: "$total" },
          due: { $sum: { $ifNull: ["$dueAmount", 0] } },
        },
      },
    ]),
  ]);
  const customerMap = new Map(customers.map((c) => [String(c._id), c]));
  const balanceMap = new Map(balances.map((b) => [String(b._id), b]));

  return NextResponse.json({
    success: true,
    partners: users.map((u) => {
      const c = customerMap.get(String(u.customerId)) || {};
      const b = balanceMap.get(String(u.customerId)) || {};
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        typeLabel: CUSTOMER_TYPES[u.role]?.short || u.role,
        business: c.name || "",
        phone: c.phone || "",
        address: c.address || "",
        invoices: b.invoices || 0,
        spent: b.spent || 0,
        due: b.due || 0,
        createdAt: u.createdAt,
      };
    }),
  });
}

// POST { business, name, phone, address, email, password, role }
// Creates the Customer (price list = role) and the login linked to it.
export async function POST(req) {
  if (!(await adminOnly())) return fail("Unauthorized", 403);
  await connectDB();

  try {
    const body = await req.json();
    const role = body.role;
    const business = String(body.business || "").trim();
    const name = String(body.name || "").trim() || business;
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!isPartnerRole(role)) throw new Error("Choose Dealer, Sub Dealer or Wholesaler");
    if (!business) throw new Error("Business / shop name is required");
    if (!/^01\d{9}$/.test(phone)) throw new Error("Phone must be 01XXXXXXXXX");
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Valid email is required");
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    if (await UserModel.exists({ email })) throw new Error("This email already has a login");

    // an existing customer (same phone) becomes the partner account
    let customer = await Customer.findOne({ phone });
    if (customer && (await UserModel.exists({ customerId: customer._id }))) {
      throw new Error("This phone number already has a partner login");
    }
    if (customer) {
      customer.name = business;
      customer.type = role;
      if (body.address) customer.address = String(body.address).trim();
      await customer.save();
    } else {
      customer = await Customer.create({
        name: business,
        phone,
        address: String(body.address || "").trim(),
        type: role,
      });
    }

    const user = await UserModel.create({
      name,
      email,
      password,
      role,
      customerId: customer._id,
      phone,
      isEmailVerified: true,
    });

    return NextResponse.json({
      success: true,
      partner: { _id: user._id, name: user.name, email: user.email, role, business },
    });
  } catch (error) {
    return fail(error.message);
  }
}

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { isPartnerRole, normalizeCustomerType } from "@/lib/priceTiers";
import UserModel from "@/models/User.model";
import Customer from "@/models/Customer.model";

// The logged-in dealer / sub dealer / wholesaler and their Customer account,
// or null. Everything a partner sees is scoped to `customer._id`.
export const getPartner = async () => {
  const auth = await isAuthenticated();
  if (!auth.isAuth || !isPartnerRole(auth.role)) return null;

  await connectDB();
  const user = await UserModel.findOne({ _id: auth.userId, deletedAt: null })
    .select("name email role customerId")
    .lean();
  if (!user?.customerId || !isPartnerRole(user.role)) return null;

  const customer = await Customer.findById(user.customerId).lean();
  if (!customer) return null;

  // the login role decides the price list, even if the customer record drifts
  return { user, customer, type: normalizeCustomerType(user.role) };
};

export const partnerUnauthorized = () =>
  NextResponse.json(
    { success: false, message: "Please log in with a dealer / wholesaler account" },
    { status: 403 },
  );

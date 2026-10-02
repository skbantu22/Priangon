import UserModel from "@/models/User.model";
import { standInEmail } from "@/lib/mobileLogin";

/**
 * Makes the portal login for a dealer, sub dealer or wholesaler. A login that
 * was deleted earlier still holds the stand-in email (it is unique), so that
 * is renamed first or the new login would fail.
 */
export async function createPartnerLogin({ customer, name, phone, address, password, role }) {
  const email = standInEmail(phone);

  const stale = await UserModel.find({ email, deletedAt: { $ne: null } }).select("_id");
  for (const old of stale) {
    await UserModel.updateOne({ _id: old._id }, { $set: { email: `${old._id}.${email}` } });
  }

  return UserModel.create({
    name,
    email,
    password,
    role,
    customerId: customer._id,
    phone,
    address: address || "",
    isEmailVerified: true,
  });
}

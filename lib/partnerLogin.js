import UserModel from "@/models/User.model";
import { standInEmail } from "@/lib/mobileLogin";

/**
 * Makes the portal login for a dealer, sub dealer or wholesaler. A login that
 * was deleted earlier still holds the stand-in email (it is unique), so that
 * is renamed first or the new login would fail. The login uses the
 * customer's real email when one was typed, so a forgotten password can be
 * reset by email.
 */
export async function createPartnerLogin({ customer, name, phone, address, password, role, email: realEmail = "" }) {
  const standIn = standInEmail(phone);
  // a real email lets them reset a forgotten password by email; one that is
  // already someone else's login falls back to the stand-in
  const typed = String(realEmail || "").trim().toLowerCase();
  const email = typed && !(await UserModel.exists({ email: typed })) ? typed : standIn;

  const stale = await UserModel.find({ email: standIn, deletedAt: { $ne: null } }).select("_id");
  for (const old of stale) {
    await UserModel.updateOne({ _id: old._id }, { $set: { email: `${old._id}.${standIn}` } });
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

import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { ROLES } from "@/lib/roles";
import UserModel from "@/models/User.model";

// GET /api/users/roles: every role with how many active logins have it (admin)
export async function GET() {
  const auth = await isAuthenticated("admin");
  if (!auth.isAuth) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
  }

  await connectDB();
  const counts = await UserModel.aggregate([
    { $match: { deletedAt: null } },
    { $group: { _id: "$role", n: { $sum: 1 } } },
  ]);
  const byRole = Object.fromEntries(counts.map((c) => [c._id, c.n]));

  return NextResponse.json({
    success: true,
    roles: ROLES.map((r) => ({ ...r, users: byRole[r.key] || 0 })),
  });
}

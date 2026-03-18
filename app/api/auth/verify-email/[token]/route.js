import { connectDB } from "@/lib/databaseconnection";
import UserModel from "@/models/User.model";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

export async function GET(request, ctx) {
  try {
    await connectDB();

    // ✅ Next.js 16: params is a Promise
    const { token: rawToken } = await ctx.params;

    if (!rawToken) {
      return Response.json(
        { success: false, message: "Token missing" },
        { status: 400 }
      );
    }

    if (!process.env.SECRET_KEY) {
      return Response.json(
        { success: false, message: "SECRET_KEY missing" },
        { status: 500 }
      );
    }

    const token = decodeURIComponent(rawToken);
    const secret = new TextEncoder().encode(process.env.SECRET_KEY);

    const { payload } = await jwtVerify(token, secret);
    const userId = payload?.userId;

    if (!userId) {
      return Response.json(
        { success: false, message: "Invalid token payload" },
        { status: 400 }
      );
    }

    const updated = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { isEmailVerified: true } },
      { new: true }
    );

    if (!updated) {
      return Response.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, message: "Email verified ✅" });
  } catch (err) {
    console.error("VERIFY ERROR:", err);
    return Response.json(
      { success: false, message: err?.code || err?.message || "Invalid token" },
      { status: 400 }
    );
  }
}

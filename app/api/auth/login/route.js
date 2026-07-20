import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";
import { zSchema } from "@/lib/zodschema";
import { z } from "zod";
import { SignJWT } from "jose";
import { sendMail } from "@/lib/sendMail";
import { emailVerificationLink } from "@/Email/emailVerificationLink";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    await connectDB();

    // ================= REQUEST BODY =================
    const payload = await request.json();
    console.log("🔥 LOGIN PAYLOAD:", payload);

    // ================= VALIDATION =================
    const validationSchema = zSchema.pick({ email: true }).extend({
      password: z.string().min(4, "Password must be at least 6 characters"),
    });

    const validatedData = validationSchema.safeParse(payload);
    console.log("🧪 VALIDATION RESULT:", validatedData);

    if (!validatedData.success) {
      return response(
        false,
        401,
        "Invalid or missing input field.",
        validatedData.error,
      );
    }

    const { email, password } = validatedData.data;

    console.log("📧 EMAIL:", email);

    // ================= FIND USER =================
    const getUser = await UserModel.findOne({ email }).select("+password");

    console.log("👤 USER FROM DB:", getUser);

    if (!getUser) {
      return response(false, 404, "Invalid login credentials.");
    }

    console.log("📨 EMAIL VERIFIED STATUS:", getUser.isEmailVerified);

    // ================= EMAIL VERIFY CHECK =================
    if (!getUser.isEmailVerified) {
      if (!process.env.SECRET_KEY) {
        return response(false, 500, "SECRET_KEY is not set in env.");
      }

      const secret = new TextEncoder().encode(process.env.SECRET_KEY);

      const token = await new SignJWT({
        userId: getUser._id.toString(),
      })
        .setIssuedAt()
        .setExpirationTime("1h")
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

      const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email/${encodeURIComponent(
        token,
      )}`;

      const html = emailVerificationLink(verifyUrl);
      sendMail("Email Verification - Prianka Fashion", email, html);

      return response(false, 403, "Please verify your email.");
    }

    // ================= PASSWORD CHECK =================
    const isPasswordVerified = await getUser.comparePassword(password);

    console.log("🔑 PASSWORD MATCH:", isPasswordVerified);

    if (!isPasswordVerified) {
      return response(false, 400, "Invalid login credentials.");
    }

    // ================= JWT TOKEN =================
    if (!process.env.SECRET_KEY) {
      return response(false, 500, "SECRET_KEY is not set in env.");
    }

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);

    const accessToken = await new SignJWT({
      id: getUser._id.toString(),
      email: getUser.email,
      role: getUser.role,
      showroomId: getUser.showroomId?.toString(),

      phone: getUser.phone,
      address: getUser.address,
      city: getUser.city,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    // ================= COOKIE SET =================
    const cookieStore = await cookies();

    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // ================= RESPONSE =================
    const responseData = {
      user: {
        id: getUser._id,
        name: getUser.name,
        email: getUser.email,
        role: getUser.role,
        showroomId: getUser.showroomId,
        phone: getUser.phone,
        address: getUser.address,
        city: getUser.city,
      },
    };

    console.log("✅ LOGIN SUCCESS RESPONSE:", responseData);

    return response(true, 200, "Login success.", responseData);
  } catch (error) {
    console.log("❌ LOGIN ERROR:", error);
    return catchError(error);
  }
}

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

    const payload = await request.json();

    const validationSchema = zSchema
      .pick({ email: true })
      .extend({
        password: z.string().min(6, "Password must be at least 6 characters"),
      });

    const validatedData = validationSchema.safeParse(payload);

    if (!validatedData.success) {
      return response(
        false,
        401,
        "Invalid or missing input field.",
        validatedData.error
      );
    }

    const { email, password } = validatedData.data;

    // ✅ MUST select password
    const getUser = await UserModel.findOne({ email }).select("+password");

    if (!getUser) {
      return response(false, 404, "Invalid login credentials.");
    }

    if (!getUser.isEmailVerified) {
      if (!process.env.SECRET_KEY) {
        return response(false, 500, "SECRET_KEY is not set in env.");
      }

      const secret = new TextEncoder().encode(process.env.SECRET_KEY);

      const token = await new SignJWT({ userId: getUser._id.toString() })
        .setIssuedAt()
        .setExpirationTime("1h")
        .setProtectedHeader({ alg: "HS256" })
        .sign(secret);

      const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email/${encodeURIComponent(
        token
      )}`;

      const html = emailVerificationLink(verifyUrl);

      sendMail("Email Verification - Prianka Fashion", email, html);

      return response(false, 403, "Please verify your email. Verification link sent.");
    }

    const isPasswordVerified = await getUser.comparePassword(password);

    if (!isPasswordVerified) {
      return response(false, 400, "Invalid login credentials.");
    }
  

    // 🔥 ADD THIS BLOCK

if (!process.env.SECRET_KEY) {
  return response(false, 500, "SECRET_KEY is not set in env.");
}

const secret = new TextEncoder().encode(process.env.SECRET_KEY);

const accessToken = await new SignJWT({
  id: getUser._id.toString(),
  email: getUser.email,
  role: getUser.role,
})
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("7d")
  .sign(secret);

const cookieStore = await cookies();

cookieStore.set("access_token", accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
});



   return response(true, 200, "Login success.", {
  user: {
    id: getUser._id,
    name: getUser.name,
    email: getUser.email,
    role: getUser.role,
  },
});
  } catch (error) {
    return catchError(error);
  }
}

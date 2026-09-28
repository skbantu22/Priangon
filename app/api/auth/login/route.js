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

    // ================= VALIDATION =================
    // "email" holds an email or a mobile number (dealer / wholesaler logins)
    const validationSchema = z.object({
      email: z.string().trim().min(3, "Enter your email or mobile number"),
      password: z.string().min(4, "Password must be at least 4 characters"),
    });

    const validatedData = validationSchema.safeParse(payload);

    if (!validatedData.success) {
      return response(
        false,
        401,
        "Invalid or missing input field.",
        validatedData.error,
      );
    }

    const { email: login, password } = validatedData.data;

    // ================= FIND USER =================
    // 01XXXXXXXXX (or +8801...) is a mobile login, anything else an email
    const mobile = login.replace(/[\s-]/g, "").replace(/^\+?88(?=01)/, "");
    const byMobile = /^01\d{9}$/.test(mobile);
    // Several logins can share a mobile (staff made before numbers were kept
    // apart): the one whose password matches is the one signing in.
    const candidates = await UserModel.find(
      byMobile ? { phone: mobile, deletedAt: null } : { email: login.toLowerCase() },
    )
      .sort({ createdAt: 1 })
      .select("+password");
    let getUser = candidates[0] || null;
    if (candidates.length > 1) {
      for (const candidate of candidates) {
        if (await candidate.comparePassword(password)) {
          getUser = candidate;
          break;
        }
      }
    }
    const email = getUser?.email || login;

    if (!getUser) {
      return response(false, 404, "Invalid login credentials.");
    }


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
      posTill: getUser.posTill || (getUser.showroomId ? "showroom" : "warehouse"),

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
      // "Remember me" off: a session cookie, gone when the browser closes
      ...(payload.remember === false ? {} : { maxAge: 60 * 60 * 24 * 7 }),
    });

    // ================= RESPONSE =================
    const responseData = {
      user: {
        id: getUser._id,
        name: getUser.name,
        email: getUser.email,
        role: getUser.role,
        showroomId: getUser.showroomId,
        posTill: getUser.posTill || (getUser.showroomId ? "showroom" : "warehouse"),
        phone: getUser.phone,
        address: getUser.address,
        city: getUser.city,
      },
    };


    return response(true, 200, "Login success.", responseData);
  } catch (error) {
    console.log("❌ LOGIN ERROR:", error);
    return catchError(error);
  }
}

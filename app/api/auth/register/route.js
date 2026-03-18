import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";


import UserModel from "@/models/User.model"; // adjust path
import { SignJWT } from "jose";

import { sendMail } from "@/lib/sendMail"; // adjust path
import { emailVerificationLink } from "@/Email/emailVerificationLink"; // adjust path
import { zSchema } from "@/lib/zodschema";

export async function POST(request) {
  try {
    await connectDB();

    // validation schema
    const validationSchema = zSchema.pick({
      name: true,
      email: true,
      password: true,
    });

    const payload = await request.json();

    const validatedData = validationSchema.safeParse(payload);

    if (!validatedData.success) {
      return response(
        false,
        401,
        "Invalid or missing input field.",
        validatedData.error
      );
    }

    const { name, email, password } = validatedData.data;

    // optional: check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return response(false, 409, "Email already registered.");
    }

    const newRegistration = await UserModel.create({
      name,
      email,
      password,
    }); // triggers pre('save') if you use save(), but create also triggers save middleware in mongoose

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    if (!process.env.SECRET_KEY) {
      return response(false, 500, "SECRET_KEY is not set in env.");
    }

    const token = await new SignJWT({ userId: newRegistration._id.toString() })
      .setIssuedAt()
      .setExpirationTime("1h")
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);

     sendMail(
      "Email Verification request from Priangon",
      email,
      emailVerificationLink(
        `${process.env.NEXT_PUBLIC_BASE_URL}/auth/verify-email/${token}`
      )
    );

    return response(true, 200, "Registration success, please verify your email.");
  } catch (error) {
    return catchError(error);
  }
}

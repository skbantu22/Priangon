import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function POST(request) {
  const auth = await requireRoles(STAFF_ROLES);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    // next-cloudinary sends params to be signed here
    const paramsToSign = body.paramsToSign || {};

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return NextResponse.json({ signature });
  } catch (error) {
    console.error("Cloudinary signature error:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 500 }
    );
  }
}

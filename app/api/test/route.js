import { connectDB } from "@/lib/databaseconnection";
import { NextResponse } from "next/server";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function GET() {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  await connectDB();
  return NextResponse.json({
    success: true,
    message: "connection success.",
  });
}

import { connectDB } from "@/lib/databaseconnection";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();
  return NextResponse.json({
    success: true,
    message: "connection success.",
  });
}

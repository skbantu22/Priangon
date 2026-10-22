import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { returnableLines } from "@/lib/saleReturnService";

/** What can still come back, found by product, barcode, IMEI or invoice (the Return sheet of the POS and Telekhata) */
export async function GET(req) {
  try {
    const auth = await requirePermission("pos.return");
    if (auth.response) return auth.response;

    await connectDB();

    const q = new URL(req.url).searchParams;
    const data = await returnableLines({
      customerId: q.get("customerId") || "",
      showroomId: q.get("showroomId") || "",
      q: q.get("q") || "",
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

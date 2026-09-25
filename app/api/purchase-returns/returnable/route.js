import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission } from "@/lib/apiAuth";
import { returnableLines } from "@/lib/purchaseReturnService";

/** Purchase rows that can still go back to the supplier */
export async function GET(req) {
  try {
    const auth = await requireAnyPermission(["purchase.return", "purchase.view"]);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const result = await returnableLines({
      supplierId: searchParams.get("supplierId"),
      search: searchParams.get("search"),
      page: Math.max(1, Number(searchParams.get("page")) || 1),
      limit: Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 50)),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

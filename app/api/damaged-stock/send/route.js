import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { sendToSupplier } from "@/lib/damagedStockService";

/** Sends broken units back to the supplier they were bought from (a purchase return) */
export async function POST(req) {
  try {
    const auth = await requirePermission("purchase.return");
    if (auth.response) return auth.response;

    await connectDB();

    let returns;
    try {
      returns = await sendToSupplier(await req.json(), await actorFullName(auth));
    } catch (formError) {
      return NextResponse.json({ success: false, message: formError.message }, { status: 400 });
    }

    const numbers = returns.map((ret) => ret.returnNumber).join(", ");
    return NextResponse.json({ success: true, message: `Purchase return ${numbers} saved`, data: returns }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

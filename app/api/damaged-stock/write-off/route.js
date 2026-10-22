import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { writeOffLots } from "@/lib/damagedStockService";

/** Writes broken units off as a loss, when no supplier will take them back */
export async function POST(req) {
  try {
    const auth = await requirePermission("stock.adjust");
    if (auth.response) return auth.response;

    await connectDB();

    let loss;
    try {
      loss = await writeOffLots(await req.json(), await actorFullName(auth));
    } catch (formError) {
      return NextResponse.json({ success: false, message: formError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Written off", loss: Math.round(loss * 100) / 100 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

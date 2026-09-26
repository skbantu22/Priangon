import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission } from "@/lib/apiAuth";
import { listLocations, locationKey } from "@/lib/stockService";
import { mainStockLocation } from "@/lib/purchaseService";

/** Where a purchase can put its goods, and the main branch it defaults to */
export async function GET() {
  try {
    const auth = await requireAnyPermission(["purchase.create", "purchase.receive"]);
    if (auth.response) return auth.response;

    await connectDB();

    const [locations, main] = await Promise.all([listLocations(), mainStockLocation()]);

    return NextResponse.json({ success: true, data: locations, main: locationKey(main) });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

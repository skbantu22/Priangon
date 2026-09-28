import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission } from "@/lib/apiAuth";
import { ensureSystemRoles } from "@/models/Role.model";
import { WAREHOUSE, WAREHOUSE_KEY, locationKey } from "@/lib/stockService";
import { purchaseLocationForAuth } from "@/lib/purchaseService";

/** The login's own branch — AmarSolution has no purchase branch picker */
export async function GET() {
  try {
    await connectDB();
    await ensureSystemRoles();

    const auth = await requireAnyPermission(["purchase.create", "purchase.receive"]);
    if (auth.response) return auth.response;

    const location = await purchaseLocationForAuth(auth);
    const row = {
      key: location.locationType === WAREHOUSE ? WAREHOUSE_KEY : String(location.locationId),
      type: location.locationType,
      id: location.locationId,
      name: location.name,
    };

    return NextResponse.json({
      success: true,
      data: [row],
      main: locationKey(location),
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

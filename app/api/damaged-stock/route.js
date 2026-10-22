import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { listLots } from "@/lib/damagedStockService";
import { resolveLockedTill } from "@/lib/posTillAuth";

/** Damaged Stock: broken units customers brought back, with the supplier and warranty each one came with */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const q = new URL(req.url).searchParams;

    // admin looks at the shop picked at the top; everyone else only at their own
    let showroomId = q.get("showroomId") || "";
    if (auth.role !== "admin") {
      const till = await resolveLockedTill(auth);
      showroomId = till.isWarehouse ? "warehouse" : String(till.orderShowroomId || "");
    }

    const lots = await listLots({
      showroomId,
      q: q.get("q") || "",
      supplierId: q.get("supplierId") || "",
      state: q.get("state") || "",
    });

    const summary = { units: 0, loss: 0, active: 0, expired: 0, none: 0, nosource: 0 };
    for (const lot of lots) {
      summary.units += lot.left;
      summary.loss += lot.left * lot.unitCost;
      summary[lot.state] += lot.left;
    }
    summary.loss = Math.round(summary.loss * 100) / 100;

    return NextResponse.json({ success: true, data: lots, summary });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

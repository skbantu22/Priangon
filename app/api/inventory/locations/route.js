import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { listLocations } from "@/lib/stockService";

/** Warehouse plus the showrooms, for every location dropdown */
export async function GET() {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const locations = await listLocations();

    // A login tied to one showroom picks from that showroom only
    const scoped =
      auth.showroomId && auth.role !== "admin" && auth.role !== "manager"
        ? locations.filter((item) => item.key === String(auth.showroomId))
        : locations;

    return NextResponse.json({ success: true, data: scoped });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

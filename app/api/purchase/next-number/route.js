import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission } from "@/lib/apiAuth";
import { longNumber } from "@/lib/documentNumber";
import { ensureSystemRoles } from "@/models/Role.model";

/** A fresh IN- number for a new purchase, purchase order or return form */
export async function GET() {
  try {
    await connectDB();
    await ensureSystemRoles();

    const auth = await requireAnyPermission(["purchase.create", "purchase.order", "purchase.return"]);
    if (auth.response) return auth.response;

    return NextResponse.json({ success: true, number: longNumber() });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

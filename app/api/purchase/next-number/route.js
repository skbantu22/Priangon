import { NextResponse } from "next/server";

import { requireAnyPermission } from "@/lib/apiAuth";
import { longNumber } from "@/lib/documentNumber";

/** A fresh IN- number for a new purchase, purchase order or return form */
export async function GET() {
  try {
    const auth = await requireAnyPermission(["purchase.create", "purchase.order", "purchase.return"]);
    if (auth.response) return auth.response;

    return NextResponse.json({ success: true, number: longNumber() });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

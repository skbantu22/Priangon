import { NextResponse } from "next/server";

import PurchaseReturnType from "@/models/PurchaseReturnType.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission, requirePermission } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

/** Every return type, for the list and the return form */
export async function GET() {
  try {
    const auth = await requireAnyPermission(["purchase.return", "purchase.view"]);
    if (auth.response) return auth.response;

    await connectDB();

    const types = await PurchaseReturnType.find({ deletedAt: null }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("purchase.return");
    if (auth.response) return auth.response;

    await connectDB();

    const name = String((await req.json()).name || "").trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Enter a return type" }, { status: 400 });
    }

    if (await PurchaseReturnType.exists({ name: exactRegex(name), deletedAt: null })) {
      return NextResponse.json(
        { success: false, message: "This return type already exists" },
        { status: 409 },
      );
    }

    const type = await PurchaseReturnType.create({ name });

    return NextResponse.json({ success: true, message: "Return type saved", data: type });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

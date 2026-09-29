import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/apiAuth";
import { loadPurchaseDetail } from "@/lib/purchaseDetail";

export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("purchase.view");
    if (auth.response) return auth.response;

    const { id } = await params;
    const result = await loadPurchaseDetail(id, auth);

    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status || 404 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

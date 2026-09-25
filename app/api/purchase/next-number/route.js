import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission } from "@/lib/apiAuth";
import { peekInvoiceNumber } from "@/lib/getNextOrderNumber";

// counter name and how a number reads, per kind of paper
const SERIES = {
  purchase: ["purchase", (seq) => `PUR-${seq}`],
  order: ["purchase_order", (seq) => `PO-${String(seq).padStart(6, "0")}`],
  return: ["purchase_return", (seq) => `PRT-${String(seq).padStart(6, "0")}`],
};

/** The number a new purchase, purchase order or return will most likely get */
export async function GET(req) {
  try {
    const auth = await requireAnyPermission(["purchase.create", "purchase.order", "purchase.return"]);
    if (auth.response) return auth.response;

    await connectDB();

    const kind = new URL(req.url).searchParams.get("kind") || "purchase";
    const [counter, format] = SERIES[kind] || SERIES.purchase;

    return NextResponse.json({ success: true, number: format(await peekInvoiceNumber(counter)) });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

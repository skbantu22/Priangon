import { NextResponse } from "next/server";

import { getPartner, partnerUnauthorized } from "@/lib/partner.server";
import { customerLedger } from "@/lib/customerService";

/**
 * GET ?start&end: the partner's own account statement: invoices, payments,
 * returns and the balance after each, the same ledger the shop keeps for them.
 */
export async function GET(req) {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const ledger = await customerLedger(partner.customer, {
      start: searchParams.get("start") || "",
      end: searchParams.get("end") || "",
      withProducts: searchParams.get("products") === "1",
    });
    return NextResponse.json({ success: true, ...ledger });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

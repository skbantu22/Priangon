import { NextResponse } from "next/server";

import { getPartner, partnerUnauthorized } from "@/lib/partner.server";
import { customerLedger } from "@/lib/customerService";
import { connectDB } from "@/lib/databaseconnection";
import { round } from "@/lib/telekhata";
import KhataEntry from "@/models/KhataEntry.model";

/**
 * GET ?start&end: the partner's own account statement: invoices, payments,
 * returns and the balance after each, the same ledger the shop keeps for them.
 *
 * Two things sit on top of that ledger so the cards add up and the balance is
 * the one the dashboard and Baki Khata show:
 *  - the opening due is counted in "Opening" (it was a row in the list but in no card)
 *  - the lines the shop wrote by hand in Baki Khata are part of the statement
 */
export async function GET(req) {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start") || "";
    const end = searchParams.get("end") || "";

    const ledger = await customerLedger(partner.customer, {
      start,
      end,
      withProducts: searchParams.get("products") === "1",
    });

    const from = start ? new Date(`${start}T00:00:00`) : null;
    const to = end ? new Date(`${end}T23:59:59.999`) : null;

    const khata = await KhataEntry.find({
      partyType: "customer",
      partyId: partner.customer._id,
      deletedAt: null,
    }).lean();

    let opening = ledger.summary.opening;
    let khataGiven = 0;
    let khataTaken = 0;
    const own = [];

    for (const line of khata) {
      const when = new Date(line.date);
      const signed = line.direction === "give" ? line.amount : -line.amount;

      if (from && when < from) {
        opening += signed;
        continue;
      }
      if (to && when > to) continue;

      if (signed >= 0) khataGiven += line.amount;
      else khataTaken += line.amount;

      own.push({
        date: line.date,
        type: line.direction === "give" ? "Baki Khata (Given)" : "Baki Khata (Taken)",
        invoiceNo: "",
        note: [line.kind === "goods" ? "Goods" : "", line.note].filter(Boolean).join(" · "),
        amount: round(signed),
      });
    }

    // the opening due the customer started with is part of "Opening"
    const openingDue = ledger.rows
      .filter((row) => row.type === "Opening Due")
      .reduce((sum, row) => sum + row.amount, 0);
    opening = round(opening + openingDue);

    // the ledger rows and the khata lines together, with one running balance
    const all = [...ledger.rows, ...own].sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = ledger.summary.opening + khata
      .filter((line) => from && new Date(line.date) < from)
      .reduce((sum, line) => sum + (line.direction === "give" ? line.amount : -line.amount), 0);
    const rows = all.map((row) => {
      balance += row.amount;
      return { ...row, balance: round(balance) };
    });

    return NextResponse.json({
      success: true,
      rows,
      productRows: ledger.productRows,
      summary: {
        ...ledger.summary,
        opening,
        khataGiven: round(khataGiven),
        khataTaken: round(khataTaken),
        due: round(balance),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

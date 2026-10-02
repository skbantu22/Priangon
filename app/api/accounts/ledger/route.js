import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Account from "@/models/Account.model";
import AccountTx from "@/models/AccountTx.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { accountScope, round } from "@/lib/accounts";

// Account Statements: every line of one account with a running balance
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: "Choose an account" }, { status: 400 });

    const shop = await accountScope(auth, searchParams.get("showroomId"));
    const account = await Account.findOne({ _id: id, showroomId: shop, deletedAt: null }).lean();
    if (!account) return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });

    const lines = await AccountTx.find({ accountId: account._id, deletedAt: null }).sort({ date: 1, createdAt: 1 }).lean();

    const from = start ? new Date(`${start}T00:00:00`) : null;
    const to = end ? new Date(`${end}T23:59:59.999`) : null;

    let balance = Number(account.openingBalance) || 0;
    let opening = balance;
    let moneyIn = 0;
    let moneyOut = 0;
    const rows = [];

    for (const line of lines) {
      const when = new Date(line.date);
      const signed = line.direction === "in" ? line.amount : -line.amount;
      balance += signed;

      if (from && when < from) {
        opening += signed;
        continue;
      }
      if (to && when > to) continue;

      if (line.direction === "in") moneyIn += line.amount;
      else moneyOut += line.amount;

      rows.push({
        _id: String(line._id),
        date: line.date,
        source: line.source,
        direction: line.direction,
        amount: line.amount,
        reference: line.reference,
        note: line.note,
        balance: round(balance),
      });
    }

    return NextResponse.json({
      success: true,
      account: { _id: String(account._id), name: account.name, type: account.type },
      rows,
      summary: { opening: round(opening), moneyIn: round(moneyIn), moneyOut: round(moneyOut), balance: round(balance) },
    });
  } catch (error) {
    console.error("ACCOUNT LEDGER ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the statement" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import Account, { ACCOUNT_TYPES } from "@/models/Account.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { accountBalances, accountScope, round } from "@/lib/accounts";

// Account List: the selected shop with what each account holds
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const shop = await accountScope(auth, new URL(req.url).searchParams.get("showroomId"));
    const accounts = await accountBalances(shop);

    return NextResponse.json({
      success: true,
      data: accounts,
      total: round(accounts.filter((a) => a.isActive !== false).reduce((sum, a) => sum + a.balance, 0)),
    });
  } catch (error) {
    console.error("ACCOUNTS LIST ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the accounts" }, { status: 500 });
  }
}

// Create Account
export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const type = String(body.type || "");
    const name = String(body.name || "").trim().slice(0, 80);

    if (!ACCOUNT_TYPES[type]) return NextResponse.json({ success: false, message: "Choose an account type" }, { status: 400 });
    if (!name) return NextResponse.json({ success: false, message: "Enter the account name" }, { status: 400 });

    const shop = await accountScope(auth, body.showroomId);

    const clash = await Account.findOne({
      showroomId: shop,
      type,
      name: new RegExp(`^${escapeRegex(name)}$`, "i"),
      deletedAt: null,
    }).lean();
    if (clash) return NextResponse.json({ success: false, message: "This account already exists" }, { status: 409 });

    const account = await Account.create({
      name,
      type,
      bankName: String(body.bankName || "").trim(),
      accountNumber: String(body.accountNumber || "").trim(),
      openingBalance: round(body.openingBalance),
      openingDate: body.openingDate ? new Date(body.openingDate) : null,
      showroomId: shop,
      note: String(body.note || "").trim().slice(0, 300),
    });

    return NextResponse.json({ success: true, message: "Account created", data: account }, { status: 201 });
  } catch (error) {
    console.error("ACCOUNT CREATE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not create the account" }, { status: 500 });
  }
}

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Account from "@/models/Account.model";
import AccountTx from "@/models/AccountTx.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { round } from "@/lib/accounts";

const find = async (id) => (mongoose.isValidObjectId(id) ? Account.findOne({ _id: id, deletedAt: null }) : null);

// Edit an account: name, bank, number, opening balance, active
export async function PUT(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const account = await find(id);
    if (!account) return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });

    const body = await req.json();

    if (body.name !== undefined) {
      const name = String(body.name).trim().slice(0, 80);
      if (!name) return NextResponse.json({ success: false, message: "Enter the account name" }, { status: 400 });
      account.name = name;
    }
    if (body.bankName !== undefined) account.bankName = String(body.bankName).trim();
    if (body.accountNumber !== undefined) account.accountNumber = String(body.accountNumber).trim();
    if (body.openingBalance !== undefined) account.openingBalance = round(body.openingBalance);
    if (body.isActive !== undefined) account.isActive = Boolean(body.isActive);

    await account.save();

    return NextResponse.json({ success: true, message: "Account updated" });
  } catch (error) {
    console.error("ACCOUNT UPDATE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not update the account" }, { status: 500 });
  }
}

// An account with history is only switched off; an empty one is deleted
export async function DELETE(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const account = await find(id);
    if (!account) return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });

    if (account.type === "cash") {
      return NextResponse.json({ success: false, message: "The Cash account cannot be deleted" }, { status: 409 });
    }

    const used = await AccountTx.exists({ accountId: account._id, deletedAt: null });

    if (used) {
      account.isActive = false;
      await account.save();
      return NextResponse.json({ success: true, message: "This account has history, so it was deactivated instead" });
    }

    account.deletedAt = new Date();
    await account.save();

    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (error) {
    console.error("ACCOUNT DELETE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not delete the account" }, { status: 500 });
  }
}

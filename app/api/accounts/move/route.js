import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Account from "@/models/Account.model";
import AccountTx from "@/models/AccountTx.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER, actorName } from "@/lib/apiAuth";
import { accountBalances, accountScope, round } from "@/lib/accounts";

const SOURCES = ["deposit", "withdraw", "transfer_out", "transfer_in"];

// Deposit/Withdraw and Balance Transfer lists
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const shop = await accountScope(auth, searchParams.get("showroomId"));
    const kind = searchParams.get("kind") === "transfer" ? ["transfer_out"] : ["deposit", "withdraw"];

    const rows = await AccountTx.find({ showroomId: shop, source: { $in: kind }, deletedAt: null })
      .sort({ date: -1, createdAt: -1 })
      .limit(300)
      .lean();

    // a transfer is two lines sharing one id: name both ends
    const ends = await AccountTx.find({
      source: "transfer_in",
      sourceId: { $in: rows.filter((row) => row.source === "transfer_out").map((row) => row.sourceId) },
    })
      .select("accountId sourceId")
      .lean();

    const accounts = await Account.find({
      _id: { $in: [...rows.map((row) => row.accountId), ...ends.map((end) => end.accountId)] },
    })
      .select("name")
      .lean();
    const names = new Map(accounts.map((account) => [String(account._id), account.name]));
    const toName = new Map(ends.map((end) => [end.sourceId, names.get(String(end.accountId)) || ""]));

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        _id: String(row._id),
        source: row.source,
        account: names.get(String(row.accountId)) || "-",
        toAccount: toName.get(row.sourceId) || "",
        amount: row.amount,
        note: row.note,
        date: row.date,
        createdBy: row.createdBy,
      })),
    });
  } catch (error) {
    console.error("ACCOUNT MOVE LIST ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the list" }, { status: 500 });
  }
}

// Deposit, withdraw, or move money between two accounts of the same shop
export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const kind = ["deposit", "withdraw", "transfer"].includes(body.kind) ? body.kind : null;
    const amount = round(body.amount);
    const date = body.date ? new Date(body.date) : new Date();
    const note = String(body.note || "").trim().slice(0, 300);
    const createdBy = actorName(auth);

    if (!kind) return NextResponse.json({ success: false, message: "Choose what to do" }, { status: 400 });
    if (!(amount > 0)) return NextResponse.json({ success: false, message: "Enter an amount greater than 0" }, { status: 400 });
    if (Number.isNaN(date.getTime())) return NextResponse.json({ success: false, message: "The date is invalid" }, { status: 400 });

    const shop = await accountScope(auth, body.showroomId);
    const balances = await accountBalances(shop);
    const find = (id) => balances.find((account) => account._id === String(id));

    const from = mongoose.isValidObjectId(body.accountId) ? find(body.accountId) : null;
    if (!from) return NextResponse.json({ success: false, message: "Choose an account" }, { status: 400 });

    const moneyOut = kind === "withdraw" || kind === "transfer";
    if (moneyOut && amount - from.balance > 0.009) {
      return NextResponse.json({ success: false, message: `${from.name} holds only ${from.balance}` }, { status: 409 });
    }

    if (kind === "transfer") {
      const to = mongoose.isValidObjectId(body.toAccountId) ? find(body.toAccountId) : null;
      if (!to) return NextResponse.json({ success: false, message: "Choose the account to move to" }, { status: 400 });
      if (to._id === from._id) return NextResponse.json({ success: false, message: "Choose two different accounts" }, { status: 400 });

      const link = new mongoose.Types.ObjectId().toString();
      await AccountTx.create([
        { accountId: from._id, showroomId: shop, direction: "out", amount, source: "transfer_out", sourceId: link, note, date, createdBy },
        { accountId: to._id, showroomId: shop, direction: "in", amount, source: "transfer_in", sourceId: link, note, date, createdBy },
      ]);
    } else {
      await AccountTx.create({
        accountId: from._id,
        showroomId: shop,
        direction: kind === "deposit" ? "in" : "out",
        amount,
        source: kind,
        note,
        date,
        createdBy,
      });
    }

    const message = kind === "transfer" ? "Balance transferred" : kind === "deposit" ? "Deposited" : "Withdrawn";
    return NextResponse.json({ success: true, message }, { status: 201 });
  } catch (error) {
    console.error("ACCOUNT MOVE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not save" }, { status: 500 });
  }
}

// Undo a deposit / withdraw / transfer (both lines of a transfer)
export async function DELETE(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const id = new URL(req.url).searchParams.get("id");
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ success: false, message: "Invalid entry" }, { status: 400 });

    const row = await AccountTx.findOne({ _id: id, source: { $in: SOURCES }, deletedAt: null });
    if (!row) return NextResponse.json({ success: false, message: "Entry not found" }, { status: 404 });

    const filter = row.source.startsWith("transfer")
      ? { sourceId: row.sourceId, source: { $in: ["transfer_in", "transfer_out"] } }
      : { _id: row._id };
    await AccountTx.updateMany({ ...filter, deletedAt: null }, { $set: { deletedAt: new Date() } });

    return NextResponse.json({ success: true, message: "Removed" });
  } catch (error) {
    console.error("ACCOUNT MOVE DELETE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not remove" }, { status: 500 });
  }
}

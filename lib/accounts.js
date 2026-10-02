import mongoose from "mongoose";

import Account from "@/models/Account.model";
import AccountTx from "@/models/AccountTx.model";
import { resolveLockedTill } from "@/lib/posTillAuth";

export const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toObjectId = (value) =>
  mongoose.isValidObjectId(String(value || "")) ? new mongoose.Types.ObjectId(String(value)) : null;

/** "warehouse", "" or a bad id means the warehouse, which is stored as null */
export const showroomOf = (value) => toObjectId(value);

/** The shop whose accounts this request works on: an admin follows the top switch, everyone else is locked to their own */
export async function accountScope(auth, requested) {
  const till = await resolveLockedTill(auth, requested);
  return till.orderShowroomId ? toObjectId(till.orderShowroomId) : null;
}

/** Cash, bKash, card... as written on a payment line, to the account type that holds it */
export function methodType(method) {
  const m = String(method || "").toLowerCase().replace(/[\s_-]+/g, "");

  if (["bkash", "nagad", "rocket", "upay", "mobilebanking", "mfs"].includes(m)) return "mobile_banking";
  if (m === "card") return "card";
  if (m === "bank" || m === "bankaccount") return "bank";
  if (m === "cheque" || m === "check" || m === "bankcheque") return "cheque";
  return "cash";
}

/** A shop always has a Cash account; it is made the first time it is needed */
export async function ensureCash(showroomId) {
  const found = await Account.findOne({ showroomId, type: "cash", deletedAt: null }).sort({ createdAt: 1 });
  if (found) return found;

  return Account.create({ name: "Cash", type: "cash", showroomId });
}

/**
 * The account a payment goes into / comes out of.
 * A chosen account wins; otherwise the shop's account of that kind (and name, for bKash / Nagad...).
 * No such account (say, no bKash account made yet) means nothing is posted.
 */
export async function resolveAccount({ showroomId, accountId, method, option }) {
  if (toObjectId(accountId)) {
    const picked = await Account.findOne({ _id: accountId, deletedAt: null, isActive: { $ne: false } });
    if (picked && String(picked.showroomId || "") === String(showroomId || "")) return picked;
  }

  const type = methodType(method || option);
  if (type === "cash") return ensureCash(showroomId);

  const list = await Account.find({ showroomId, type, deletedAt: null, isActive: { $ne: false } })
    .sort({ createdAt: 1 })
    .lean();
  if (!list.length) return null;

  const want = String(option || method || "").toLowerCase();
  const hit = want && list.find((account) => account.name.toLowerCase().includes(want));

  return hit ? Account.findById(hit._id) : Account.findById(list[0]._id);
}

/** Puts one payment on an account's statement. Returns null when the shop has no account for it. */
export async function postTx({ showroomId, accountId, method, option, direction, amount, source, sourceId = "", reference = "", note = "", date, createdBy = "" }) {
  const value = round(amount);
  if (!(value > 0)) return null;

  const shop = showroomOf(showroomId);
  const account = await resolveAccount({ showroomId: shop, accountId, method, option });
  if (!account) return null;

  return AccountTx.create({
    accountId: account._id,
    showroomId: shop,
    direction,
    amount: value,
    source,
    sourceId: String(sourceId || ""),
    reference,
    note,
    date: date ? new Date(date) : new Date(),
    createdBy,
  });
}

/** For the payment flows: a problem here must never undo a sale, purchase or payment */
export async function recordMoney(args) {
  try {
    return await postTx(args);
  } catch (error) {
    console.error("ACCOUNT POST ERROR:", error.message);
    return null;
  }
}

/** A payment was deleted: take its lines off the statements */
export async function removeTx(source, sourceId) {
  try {
    await AccountTx.updateMany({ source, sourceId: String(sourceId), deletedAt: null }, { $set: { deletedAt: new Date() } });
  } catch (error) {
    console.error("ACCOUNT REMOVE ERROR:", error.message);
  }
}

/** Every account of a shop with what it holds: opening balance + money in - money out */
export async function accountBalances(showroomId, { includeInactive = false } = {}) {
  const shop = showroomOf(showroomId);
  await ensureCash(shop);

  const accounts = await Account.find({ showroomId: shop, deletedAt: null, ...(includeInactive ? {} : {}) })
    .sort({ type: 1, createdAt: 1 })
    .lean();

  const sums = await AccountTx.aggregate([
    { $match: { accountId: { $in: accounts.map((account) => account._id) }, deletedAt: null } },
    {
      $group: {
        _id: "$accountId",
        in: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$amount", 0] } },
        out: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$amount", 0] } },
      },
    },
  ]);
  const bySum = new Map(sums.map((row) => [String(row._id), row]));

  return accounts.map((account) => {
    const row = bySum.get(String(account._id));
    return {
      ...account,
      _id: String(account._id),
      showroomId: account.showroomId ? String(account.showroomId) : null,
      moneyIn: round(row?.in || 0),
      moneyOut: round(row?.out || 0),
      balance: round((Number(account.openingBalance) || 0) + (row?.in || 0) - (row?.out || 0)),
    };
  });
}

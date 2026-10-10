import mongoose from "mongoose";

import KhataEntry from "@/models/KhataEntry.model";
import Customer from "@/models/Customer.model";
import Supplier from "@/models/Supplier.model";
import { customerBalances } from "@/lib/customerService";
import { supplierBalances } from "@/lib/supplierService";
import { shopKeyMatch } from "@/lib/branchScope";

export const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const TYPES = ["customer", "supplier", "employee"];
export const cleanType = (type) => (TYPES.includes(type) ? type : "customer");

/**
 * Match for one showroom's book; "all" or empty reads every book.
 *
 * Khata lines keep the shop as a plain string, and the oldest ones were
 * written before the field existed, so those count as the warehouse's.
 */
export const bookMatch = (showroomId) => shopKeyMatch(showroomId);

/**
 * Telekhata sign: above 0 the party owes the shop (Pabo), below 0 the shop owes them (Dibo).
 * The sales, purchases and payments already in the system count too, so the
 * old pages and Telekhata always show the same figure.
 *
 *   customer: what they owe us        = customer due
 *   supplier: what we owe them (Dibo) = minus supplier due
 */
export const fromSystem = (partyType, amount) => (partyType === "supplier" ? -amount : amount);

/**
 * What the sales / purchases / payments already say, per party id.
 *
 * `showroomId` is the shop switch at the top: pass it and only that shop's
 * invoices, receipts and opening dues count, so Telekhata and the dashboard
 * read the same book.
 */
export async function systemBalanceMap(partyType, ids, showroomId) {
  if (partyType === "employee") return new Map();

  if (partyType === "customer") {
    const customers = await Customer.find({ deletedAt: null, ...(ids && { _id: { $in: ids } }) })
      .select("openingDue initialAdvance openingShowroomId")
      .lean();
    const balances = await customerBalances(customers, { showroomId });
    return new Map(customers.map((row) => [String(row._id), fromSystem("customer", balances.get(String(row._id))?.due || 0)]));
  }

  const suppliers = await Supplier.find({ deletedAt: null, ...(ids && { _id: { $in: ids } }) })
    .select("openingBalance initialAdvance showroomId")
    .lean();
  const balances = await supplierBalances(suppliers, { showroomId });
  return new Map(suppliers.map((row) => [String(row._id), fromSystem("supplier", balances.get(String(row._id))?.due || 0)]));
}

/** Telekhata-only lines (manual baki, goods baki) per party, give minus take */
export async function khataMap({ partyType, showroomId } = {}) {
  const rows = await KhataEntry.aggregate([
    { $match: { deletedAt: null, ...(partyType && { partyType }), ...bookMatch(showroomId) } },
    {
      $group: {
        _id: { type: "$partyType", id: "$partyId" },
        give: { $sum: { $cond: [{ $eq: ["$direction", "give"] }, "$amount", 0] } },
        take: { $sum: { $cond: [{ $eq: ["$direction", "take"] }, "$amount", 0] } },
        last: { $max: "$date" },
      },
    },
  ]);

  return new Map(
    rows.map((row) => [`${row._id.type}:${row._id.id}`, { net: round(row.give - row.take), last: row.last }]),
  );
}

/**
 * Every party's balance in one place, plus the Pabo / Dibo totals.
 * `balance` = what the system says + the Telekhata-only lines.
 *
 * Pass the shop switch as `showroomId` and the whole book narrows to that
 * shop — the same figures the dashboard shows for it.
 */
export async function unifiedBook(showroomId) {
  const [customers, suppliers, khata] = await Promise.all([
    systemBalanceMap("customer", null, showroomId),
    systemBalanceMap("supplier", null, showroomId),
    khataMap({ showroomId }),
  ]);

  const book = new Map();
  const put = (type, id, system) => {
    const key = `${type}:${id}`;
    const entry = khata.get(key);
    book.set(key, { partyType: type, partyId: id, system, khata: entry?.net || 0, balance: round(system + (entry?.net || 0)), last: entry?.last || null });
  };

  for (const [id, system] of customers) put("customer", id, system);
  for (const [id, system] of suppliers) put("supplier", id, system);
  // employees have no sales or purchases: only Telekhata lines
  for (const [key, entry] of khata) {
    if (!key.startsWith("employee:")) continue;
    put("employee", key.slice("employee:".length), 0);
    book.get(key).last = entry.last;
  }

  let pabo = 0;
  let dibo = 0;
  for (const row of book.values()) {
    if (row.balance > 0) pabo += row.balance;
    else dibo += -row.balance;
  }

  return { book, totals: { pabo: round(pabo), dibo: round(dibo) } };
}

/**
 * Home-card Pabo / Dibo for one open till.
 *
 * This reads the same book as the Baki Khata list and the dashboard due
 * cards, so all three agree by construction. It used to add up invoice dues
 * on its own and leave out receipts, which made the home card, the list and
 * the dashboard show three different numbers for one shop.
 */
export async function tillHomeBalance(showroomId) {
  const { totals } = await unifiedBook(showroomId || "warehouse");

  return { ...totals, balance: round(totals.pabo - totals.dibo) };
}

// Kept for the entries that only exist in Telekhata (history, summaries of a period)
export async function partyBalances({ partyType, showroomId, ids } = {}) {
  const match = {
    deletedAt: null,
    ...(partyType && { partyType }),
    ...bookMatch(showroomId),
    ...(ids && { partyId: { $in: ids.map((id) => new mongoose.Types.ObjectId(String(id))) } }),
  };

  const rows = await KhataEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: { type: "$partyType", id: "$partyId" },
        give: { $sum: { $cond: [{ $eq: ["$direction", "give"] }, "$amount", 0] } },
        take: { $sum: { $cond: [{ $eq: ["$direction", "take"] }, "$amount", 0] } },
        last: { $max: "$date" },
      },
    },
  ]);

  return rows.map((row) => ({
    partyType: row._id.type,
    partyId: String(row._id.id),
    give: round(row.give),
    take: round(row.take),
    balance: round(row.give - row.take),
    last: row.last,
  }));
}

export const totalsOf = (balances) => {
  let pabo = 0;
  let dibo = 0;
  for (const row of balances) {
    if (row.balance > 0) pabo += row.balance;
    else dibo += -row.balance;
  }
  return { pabo: round(pabo), dibo: round(dibo) };
};

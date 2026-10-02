import mongoose from "mongoose";

import KhataEntry from "@/models/KhataEntry.model";
import Customer from "@/models/Customer.model";
import Supplier from "@/models/Supplier.model";
import POSOrder from "@/models/posorder.model";
import Purchase from "@/models/Purchase.model";
import { customerBalances } from "@/lib/customerService";
import { supplierBalances } from "@/lib/supplierService";

export const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const TYPES = ["customer", "supplier", "employee"];
export const cleanType = (type) => (TYPES.includes(type) ? type : "customer");

/** Match for one showroom's book; "all" or empty reads every book */
export const bookMatch = (showroomId) => {
  const id = String(showroomId || "");
  if (!id || id === "all") return {};
  return { showroomId: id };
};

/**
 * Telekhata sign: above 0 the party owes the shop (Pabo), below 0 the shop owes them (Dibo).
 * The sales, purchases and payments already in the system count too, so the
 * old pages and Telekhata always show the same figure.
 *
 *   customer: what they owe us        = customer due
 *   supplier: what we owe them (Dibo) = minus supplier due
 */
export const fromSystem = (partyType, amount) => (partyType === "supplier" ? -amount : amount);

/** What the sales / purchases / payments already say, per party id */
export async function systemBalanceMap(partyType, ids) {
  if (partyType === "employee") return new Map();

  if (partyType === "customer") {
    const customers = await Customer.find({ deletedAt: null, ...(ids && { _id: { $in: ids } }) })
      .select("openingDue initialAdvance")
      .lean();
    const balances = await customerBalances(customers);
    return new Map(customers.map((row) => [String(row._id), fromSystem("customer", balances.get(String(row._id))?.due || 0)]));
  }

  const suppliers = await Supplier.find({ deletedAt: null, ...(ids && { _id: { $in: ids } }) })
    .select("openingBalance initialAdvance")
    .lean();
  const balances = await supplierBalances(suppliers);
  return new Map(suppliers.map((row) => [String(row._id), fromSystem("supplier", balances.get(String(row._id))?.due || 0)]));
}

/** Telekhata-only lines (manual baki, goods baki) per party, give minus take */
export async function khataMap({ partyType } = {}) {
  const rows = await KhataEntry.aggregate([
    { $match: { deletedAt: null, ...(partyType && { partyType }) } },
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
 */
export async function unifiedBook() {
  const [customers, suppliers, khata] = await Promise.all([
    systemBalanceMap("customer"),
    systemBalanceMap("supplier"),
    khataMap(),
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
 * Sales due and purchase due are the invoices written at that showroom
 * (or warehouse, where showroomId is empty). Handwritten khata lines already
 * carry showroomId. Opening dues and payments that were never tagged to a
 * shop stay on the party statement; folding them in here would invent a split.
 */
export async function tillHomeBalance(showroomId) {
  const id = String(showroomId || "warehouse");
  const isShowroom = mongoose.isValidObjectId(id);
  const here = isShowroom ? { showroomId: new mongoose.Types.ObjectId(id) } : { showroomId: null };

  const [saleDue, purchaseDue, khata] = await Promise.all([
    POSOrder.aggregate([
      { $match: { status: "completed", ...here } },
      { $group: { _id: null, due: { $sum: { $ifNull: ["$dueAmount", 0] } } } },
    ]),
    Purchase.aggregate([
      { $match: { deletedAt: null, status: { $ne: "cancelled" }, ...here } },
      { $group: { _id: null, due: { $sum: { $ifNull: ["$dueAmount", 0] } } } },
    ]),
    KhataEntry.aggregate([
      { $match: { deletedAt: null, ...bookMatch(id) } },
      { $group: { _id: "$direction", total: { $sum: "$amount" } } },
    ]),
  ]);

  const side = (direction) => khata.find((row) => row._id === direction)?.total || 0;
  const pabo = round((saleDue[0]?.due || 0) + side("give"));
  const dibo = round((purchaseDue[0]?.due || 0) + side("take"));

  return { pabo, dibo, balance: round(pabo - dibo) };
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

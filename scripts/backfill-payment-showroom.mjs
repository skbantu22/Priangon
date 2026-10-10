/**
 * Puts a shop on the customer and supplier payments written before the
 * branch switch split the dues.
 *
 * Without it every old receipt counts as the warehouse's, so a showroom's
 * Pabo looks far too high the moment the switch starts filtering.
 *
 * Which shop a payment belongs to, in order:
 *   1. the invoice it was written against
 *   2. the shop that keeps the customer / supplier
 *   3. the warehouse (null)
 *
 * Run:  node scripts/backfill-payment-showroom.mjs [--dry]
 * Safe to run again: rows already carrying a shop are left alone unless
 * --all is passed.
 */
import fs from "node:fs";
import mongoose from "mongoose";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
  if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
}

const dry = process.argv.includes("--dry");
const redoAll = process.argv.includes("--all");

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB || "MobiZone",
});

const db = mongoose.connection.db;
console.log(`db: ${db.databaseName}${dry ? "  (dry run, nothing is written)" : ""}\n`);

/** Reads one id field off a collection, as a Map of id -> showroomId */
const shopsOf = async (collection, ids, field = "showroomId") => {
  if (!ids.length) return new Map();

  const rows = await db
    .collection(collection)
    .find({ _id: { $in: ids } })
    .project({ [field]: 1 })
    .toArray();

  return new Map(rows.map((row) => [String(row._id), row[field] ?? null]));
};

async function backfill({ label, collection, partyField, partyCollection, partyShopField, allocationField, invoiceCollection }) {
  const query = redoAll ? {} : { showroomId: { $in: [null, undefined] } };
  const rows = await db.collection(collection).find(query).toArray();

  if (!rows.length) {
    console.log(`${label}: nothing to do`);
    return;
  }

  const invoiceIds = [
    ...new Set(
      rows
        .flatMap((row) => row.allocations || [])
        .map((one) => one?.[allocationField])
        .filter(Boolean)
        .map(String),
    ),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const partyIds = [...new Set(rows.map((row) => String(row[partyField])).filter(Boolean))].map(
    (id) => new mongoose.Types.ObjectId(id),
  );

  const [byInvoice, byParty] = await Promise.all([
    shopsOf(invoiceCollection, invoiceIds),
    shopsOf(partyCollection, partyIds, partyShopField),
  ]);

  const writes = [];
  const tally = { invoice: 0, party: 0, warehouse: 0 };

  for (const row of rows) {
    const firstInvoice = (row.allocations || []).map((one) => one?.[allocationField]).find(Boolean);

    let shop = firstInvoice ? byInvoice.get(String(firstInvoice)) : undefined;
    if (shop) tally.invoice++;

    if (!shop) {
      shop = byParty.get(String(row[partyField])) ?? null;
      if (shop) tally.party++;
      else tally.warehouse++;
    }

    writes.push({
      updateOne: { filter: { _id: row._id }, update: { $set: { showroomId: shop ?? null } } },
    });
  }

  if (!dry) {
    for (let from = 0; from < writes.length; from += 500) {
      await db.collection(collection).bulkWrite(writes.slice(from, from + 500), { ordered: false });
    }
  }

  console.log(
    `${label}: ${rows.length} row(s) — ${tally.invoice} from their invoice, ${tally.party} from the party, ${tally.warehouse} left at the warehouse`,
  );
}

await backfill({
  label: "customer payments",
  collection: "customerpayments",
  partyField: "customerId",
  partyCollection: "customers",
  partyShopField: "openingShowroomId",
  allocationField: "orderId",
  invoiceCollection: "posorders",
});

await backfill({
  label: "supplier payments",
  collection: "supplierpayments",
  partyField: "supplierId",
  partyCollection: "suppliers",
  partyShopField: "showroomId",
  allocationField: "purchaseId",
  invoiceCollection: "purchases",
});

await mongoose.disconnect();
console.log("\ndone");

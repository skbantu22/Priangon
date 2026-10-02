import mongoose from "mongoose";

const { EJSON } = mongoose.mongo.BSON;

/**
 * Whole-database backup and restore.
 *
 * The file is Extended JSON, which is how mongo itself writes a dump: dates
 * stay dates and an _id comes back as the same ObjectId, so a restore puts
 * every reference back exactly where it was. Plain JSON.stringify would turn
 * both into strings and quietly break every relation in the shop.
 */

export const BACKUP_VERSION = 1;

/** Mongo's own bookkeeping, never ours to copy */
const SKIP = /^(system\.|__)/;

const collections = async (db) => {
  const list = await db.listCollections({}, { nameOnly: true }).toArray();

  return list
    .map((entry) => entry.name)
    .filter((name) => !SKIP.test(name))
    .sort();
};

/** The whole database as one Extended JSON string */
export async function buildBackup() {
  const db = mongoose.connection.db;
  const names = await collections(db);

  const data = {};
  const counts = {};

  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();

    data[name] = docs;
    counts[name] = docs.length;
  }

  const payload = {
    version: BACKUP_VERSION,
    database: db.databaseName,
    takenAt: new Date(),
    counts,
    data,
  };

  return { json: EJSON.stringify(payload, { relaxed: false }), counts, names };
}

/** A backup file's name, with the date so a folder of them stays readable */
export const backupFileName = (database) =>
  `${database || "backup"}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;

/**
 * Puts a backup file back.
 *
 * `merge` leaves anything the file does not mention alone and overwrites the
 * rest by _id — the safe default. `replace` empties each collection the file
 * carries first, so the database ends up exactly as the backup left it.
 */
export async function restoreBackup(fileText, { mode = "merge" } = {}) {
  const parsed = EJSON.parse(fileText, { relaxed: false });

  if (!parsed || typeof parsed !== "object" || !parsed.data || typeof parsed.data !== "object") {
    throw new Error("This file is not a backup taken from this app");
  }

  if (Number(parsed.version) > BACKUP_VERSION) {
    throw new Error("This backup was taken by a newer version of the app");
  }

  const db = mongoose.connection.db;
  const restored = {};

  for (const [name, docs] of Object.entries(parsed.data)) {
    if (SKIP.test(name) || !Array.isArray(docs)) continue;

    const collection = db.collection(name);

    if (mode === "replace") await collection.deleteMany({});

    if (docs.length === 0) {
      restored[name] = 0;
      continue;
    }

    // one upsert per document, so a half-matching database merges cleanly
    const writes = docs.map((doc) => ({
      replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
    }));

    // batched, or a big collection builds one enormous command
    for (let from = 0; from < writes.length; from += 500) {
      await collection.bulkWrite(writes.slice(from, from + 500), { ordered: false });
    }

    restored[name] = docs.length;
  }

  return {
    mode,
    takenAt: parsed.takenAt || null,
    database: parsed.database || null,
    restored,
    total: Object.values(restored).reduce((sum, n) => sum + n, 0),
  };
}

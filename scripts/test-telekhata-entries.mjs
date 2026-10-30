/**
 * Does the fix hold for the case that was breaking?
 *
 * Builds the exact shape that went wrong: a customer who owes nothing on any
 * invoice but carries handwritten baki, plus one who was pushed into a false
 * advance. Then runs real entries through the real endpoint and checks the
 * money lands where it belongs. Everything it makes is deleted at the end.
 */
import fs from "node:fs";
import mongoose from "mongoose";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
  if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
}

const BASE = process.env.TEST_SITE || "http://localhost:3000";
const PASSWORD = "test1234";
const TAG = "ZZF" + Date.now().toString().slice(-6);

// Atlas is reached over an SRV lookup, which this machine resolves only
// now and then; keep trying rather than failing the whole run on one miss.
for (let i = 1; i <= 12; i++) {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB || "MobiZone",
      serverSelectionTimeoutMS: 30000,
    });
    break;
  } catch (e) {
    if (i === 12) throw e;
    console.error("db connect attempt " + i + " failed (" + e.message.slice(0, 44) + "), waiting...");
    await new Promise((r) => setTimeout(r, 4000));
  }
}
const db = mongoose.connection.db;
const shop = await db.collection("showrooms").findOne({ isActive: { $ne: false } });
const SHOP = String(shop._id);

const bcrypt = (await import("bcryptjs")).default;
const email = TAG.toLowerCase() + "@test.local";
const admin = await db.collection("users").insertOne({
  role: "admin", name: TAG, email,
  password: await bcrypt.hash(PASSWORD, 10),
  phone: "0184" + TAG.slice(-7),
  posTill: "warehouse", isEmailVerified: true, isActive: true,
  tokenVersion: 0, deletedAt: null, createdAt: new Date(), updatedAt: new Date(),
});

const r = await fetch(BASE + "/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password: PASSWORD }),
  signal: AbortSignal.timeout(60000),
});
const cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
if (!cookie) throw new Error("login failed on " + BASE);

const post = async (body) =>
  (await fetch(BASE + "/api/telekhata/entries", {
    method: "POST", headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify(body), signal: AbortSignal.timeout(90000),
  })).json();

const get = async (u) => (await fetch(BASE + u, { headers: { cookie }, signal: AbortSignal.timeout(90000) })).json();
const n = (v) => Math.round(Number(v) || 0).toLocaleString("en-IN");

const made = [];
let fails = 0;

const newCustomer = async (label) => {
  const res = await db.collection("customers").insertOne({
    name: `${TAG} ${label}`, phone: "01" + String(Date.now()).slice(-9),
    type: "retail", address: "", isActive: true, deletedAt: null,
    openingDue: 0, initialAdvance: 0, totalOrders: 0, totalSpent: 0,
    openingShowroomId: shop._id, createdAt: new Date(), updatedAt: new Date(),
  });
  made.push(res.insertedId);
  return String(res.insertedId);
};

const entry = (id, direction, amount) =>
  post({ partyType: "customer", partyId: id, direction, kind: "money", amount, note: TAG, showroomId: SHOP });

const balanceOf = async (id) => {
  const body = await get(`/api/telekhata/parties?type=customer&showroomId=${SHOP}&search=${TAG}`);
  return (body.parties || []).find((p) => p._id === id)?.balance ?? 0;
};

const payTypes = async (id) => {
  const rows = await db.collection("customerpayments")
    .find({ customerId: new mongoose.Types.ObjectId(id), deletedAt: null }).toArray();
  return rows.map((p) => `${p.type} ${Math.round(p.amount)}`).sort();
};

const check = (name, ok, detail) => {
  if (!ok) fails++;
  console.log((ok ? "  PASS  " : "  FAIL  ") + name.padEnd(46) + (detail || ""));
};

console.log(`testing ${BASE}, shop: ${shop.name}\n`);

// ---- 1. baki on the handwritten page, nothing on any invoice ----
console.log("1) handwritten baki repaid — must settle the book, not become an advance");
const a = await newCustomer("A");
console.log("    " + (await entry(a, "give", 5000)).message);
console.log("    " + (await entry(a, "take", 2000)).message);
check("balance is 3,000", Math.abs((await balanceOf(a)) - 3000) < 0.5, "got " + n(await balanceOf(a)));
check("no advance was invented", (await payTypes(a)).every((t) => !t.startsWith("advance")), (await payTypes(a)).join(", ") || "no payments");

// ---- 2. paid more than the baki — the surplus IS an advance ----
console.log("\n2) paid more than owed — the surplus is a real advance");
const b = await newCustomer("B");
console.log("    " + (await entry(b, "give", 1000)).message);
console.log("    " + (await entry(b, "take", 2500)).message);
check("balance is -1,500", Math.abs((await balanceOf(b)) + 1500) < 0.5, "got " + n(await balanceOf(b)));
check("advance of 1,500 recorded", (await payTypes(b)).includes("advance 1500"), (await payTypes(b)).join(", "));

// ---- 3. the case that threw: more baki while a false advance sits there ----
console.log("\n3) more baki given while the system shows an advance — must not error");
const c = await newCustomer("C");
await entry(c, "give", 1000);
await entry(c, "take", 3000); // pushes 2,000 into an advance
const before = await balanceOf(c);
const res3 = await entry(c, "give", 100);
check("entry saved, no error", res3.success === true, res3.message || "");
check("balance moved by exactly 100", Math.abs((await balanceOf(c)) - (before + 100)) < 0.5,
  `${n(before)} -> ${n(await balanceOf(c))}`);

// ---- 4. the shop genuinely owes: paying back still works ----
console.log("\n4) shop genuinely owes money — paying it back still works");
const d = await newCustomer("D");
await entry(d, "take", 800); // pure advance, nothing owed
const res4 = await entry(d, "give", 500);
check("entry saved, no error", res4.success === true, res4.message || "");
check("balance is -300", Math.abs((await balanceOf(d)) + 300) < 0.5, "got " + n(await balanceOf(d)));

// -------------------------------------------------------------- cleanup
for (const id of made) {
  await db.collection("customerpayments").deleteMany({ customerId: id });
  await db.collection("khataentries").deleteMany({ partyId: id });
  await db.collection("customers").deleteOne({ _id: id });
}
await db.collection("accounttxes").deleteMany({ note: { $regex: TAG } }).catch(() => {});
await db.collection("users").deleteOne({ _id: admin.insertedId });
await mongoose.disconnect();

console.log(`\ncleaned up ${made.length} test customers and their rows`);
console.log("\n" + (fails === 0 ? "ALL CHECKS PASSED" : fails + " CHECK(S) FAILED"));

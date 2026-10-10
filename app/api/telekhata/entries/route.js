import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import Supplier from "@/models/Supplier.model";
import Employee from "@/models/Employee.model";
import KhataEntry from "@/models/KhataEntry.model";
import KhataParty from "@/models/KhataParty.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER, actorName } from "@/lib/apiAuth";
import {
  createCustomerPayment,
  customerBalance,
  customerLedger,
  dueInvoices as customerDue,
} from "@/lib/customerService";
import {
  createSupplierPayment,
  dueInvoices as supplierDue,
  supplierBalance,
  supplierLedger,
} from "@/lib/supplierService";
import { cleanType, fromSystem, round } from "@/lib/telekhata";
import { POST as createShowroomSale } from "@/app/api/showroom-orders/route";
import { POST as createPurchase } from "@/app/api/purchase/create/route";

const partyModel = (type) => (type === "supplier" ? Supplier : type === "employee" ? Employee : Customer);

// What the old sales / purchase / payment lines are called in Telekhata
const LABEL = {
  Sale: "বিক্রি",
  "Sale Payment": "বিক্রির নগদ",
  "Sale Return": "বিক্রয় ফেরত",
  "Opening Due": "শুরুর বাকি",
  "Opening Advance": "শুরুর অগ্রিম",
  "Due Received": "বাকি আদায়",
  "Due Paid": "টাকা ফেরত",
  "Due Dismiss": "বাকি মওকুফ",
  "Advance Received": "অগ্রিম নেওয়া",
  "Advance Paid": "অগ্রিম দেওয়া",
  "Advance Refund": "অগ্রিম ফেরত",
  Purchase: "ক্রয়",
  "Purchase Payment": "ক্রয়ের টাকা",
  "Purchase Return": "ক্রয় ফেরত",
};

/** The lines the sales, purchases and payments already hold, in Telekhata's sign */
async function systemLines(partyType, party) {
  if (partyType === "employee") return [];

  const ledger = partyType === "supplier" ? await supplierLedger(party) : await customerLedger(party);

  return ledger.rows.map((line, index) => {
    const signed = fromSystem(partyType, Number(line.amount) || 0);
    return {
      key: `sys-${index}`,
      source: "system",
      date: line.date,
      direction: signed >= 0 ? "give" : "take",
      kind: "money",
      amount: Math.abs(signed),
      signed,
      note: [LABEL[line.type] || line.type, line.invoiceNo, line.note].filter(Boolean).join(" · "),
      photo: "",
    };
  });
}

/** One party's statement: the old lines and the Telekhata lines together, with a running balance */
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const partyType = cleanType(searchParams.get("type"));
    const id = searchParams.get("id");
    const showroomId = searchParams.get("showroomId") || "";
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Choose a party" }, { status: 400 });
    }

    const party = await partyModel(partyType).findById(id).lean();
    if (!party) return NextResponse.json({ success: false, message: "Party not found" }, { status: 404 });

    const [meta, entries, system] = await Promise.all([
      KhataParty.findOne({ partyType, partyId: id, showroomId: String(showroomId || "warehouse") }).lean(),
      KhataEntry.find({ partyType, partyId: id, deletedAt: null }).lean(),
      systemLines(partyType, party),
    ]);

    const own = entries.map((line) => ({
      key: String(line._id),
      source: "khata",
      _id: String(line._id),
      date: line.date,
      direction: line.direction,
      kind: line.kind,
      amount: line.amount,
      signed: line.direction === "give" ? line.amount : -line.amount,
      note: line.note,
      photo: line.photo,
    }));

    const lines = [...system, ...own].sort((a, b) => new Date(a.date) - new Date(b.date) || (a.source === "system" ? -1 : 1));

    const from = start ? new Date(`${start}T00:00:00`) : null;
    const to = end ? new Date(`${end}T23:59:59.999`) : null;

    let balance = 0;
    let opening = 0;
    let given = 0;
    let taken = 0;
    const rows = [];

    for (const line of lines) {
      const when = new Date(line.date);
      balance += line.signed;

      if (from && when < from) {
        opening += line.signed;
        continue;
      }
      if (to && when > to) continue;

      if (line.signed >= 0) given += line.amount;
      else taken += line.amount;

      rows.push({
        _id: line.key,
        source: line.source,
        date: line.date,
        direction: line.direction,
        kind: line.kind,
        amount: round(line.amount),
        note: line.note,
        photo: line.photo,
        balance: round(balance),
      });
    }

    return NextResponse.json({
      success: true,
      party: {
        _id: String(party._id),
        name: party.name,
        phone: party.phone || party.mobile || "",
        photo: party.photo || "",
        type: party.type || "retail",
        dueDate: meta?.dueDate || null,
      },
      rows,
      summary: { opening: round(opening), given: round(given), taken: round(taken), balance: round(balance) },
    });
  } catch (error) {
    console.error("TELEKHATA ENTRIES ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the statement" }, { status: 500 });
  }
}

/** Oldest invoice first: the shares of `amount` that fit what each invoice still owes */
async function callRoute(handler, url, payload) {
  const response = await handler(
    new Request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  let json = {};
  try {
    json = await response.json();
  } catch {
    json = { success: false, message: "Could not save" };
  }
  return { ok: response.ok && json.success !== false, json };
}

// Customer goods on credit = a due POS sale (stock out). Supplier goods on
// credit = a due purchase (stock in). No KhataEntry for the same amount.
async function saveGoodsBaki({ req, party, partyType, body, date, note }) {
  if (partyType === "employee") {
    return NextResponse.json({ success: false, message: "কর্মচারীর পণ্য বাকি এখানে সেভ হয় না" }, { status: 400 });
  }

  const raw = Array.isArray(body.items) ? body.items : [];
  const items = raw
    .map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: String(item.productName || item.name || "").trim(),
      qty: Number(item.qty),
      price: round(item.price),
    }))
    .filter((item) => item.qty > 0 && mongoose.isValidObjectId(item.variantId));

  if (!items.length) {
    return NextResponse.json({ success: false, message: "পণ্য বেছে নিন" }, { status: 400 });
  }

  const total = round(items.reduce((sum, item) => sum + item.qty * item.price, 0));
  if (!(total > 0)) {
    return NextResponse.json({ success: false, message: "পণ্যের দাম ০-এর বেশি হতে হবে" }, { status: 400 });
  }

  const showroomId = body.showroomId || "warehouse";

  if (partyType === "customer") {
    const phone = String(party.phone || "").trim();
    if (!phone) {
      return NextResponse.json({ success: false, message: "বাকি বেচায় কাস্টমারের মোবাইল লাগবে" }, { status: 400 });
    }
    const saved = await callRoute(createShowroomSale, req.url, {
      showroomId,
      soldFrom: String(showroomId) === "warehouse" ? "WAREHOUSE" : "SHOWROOM",
      orderType: "pos",
      customerId: String(party._id),
      customerName: party.name,
      phone,
      address: party.address || "",
      customerType: party.type || "retail",
      saleDate: date.toISOString(),
      subTotal: total,
      discount: 0,
      vat: 0,
      total,
      deliveryCharge: 0,
      payments: [{ type: "Cash", amount: 0 }],
      remark: note || "টেলিখাতায় পণ্য বাকি",
      soldBy: "টেলিখাতা",
      items: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        qty: item.qty,
        price: item.price,
        subtotal: round(item.qty * item.price),
      })),
    });
    if (!saved.ok) {
      return NextResponse.json({ success: false, message: saved.json.message || "বেচা সেভ হয়নি" }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      message: `বেচা সেভ হয়েছে, বাকি ${total}`,
      saved: [`বেচা ${total}`],
    });
  }

  const saved = await callRoute(createPurchase, req.url, {
    supplierId: String(party._id),
    showroomId,
    purchaseDate: date.toISOString(),
    note: note || "টেলিখাতায় পণ্য বাকি",
    discountValue: 0,
    shippingCost: 0,
    items: items.map((item) => ({
      variantId: item.variantId,
      quantity: item.qty,
      unitPrice: item.price,
    })),
    payments: [],
  });
  if (!saved.ok) {
    return NextResponse.json({ success: false, message: saved.json.message || "কেনা সেভ হয়নি" }, { status: 400 });
  }
  return NextResponse.json({
    success: true,
    message: `কেনা সেভ হয়েছে, বাকি ${total}`,
    saved: [`কেনা ${total}`],
  });
}

const share = (invoices, amount, field) => {
  let left = amount;
  const out = [];
  for (const invoice of invoices) {
    if (left <= 0.009) break;
    const part = round(Math.min(left, invoice.due));
    if (part > 0) out.push({ [field]: invoice.id, amount: part });
    left = round(left - part);
  }
  return out;
};

/**
 * Dichhi (give) / Nichhi (take).
 *
 * Money that settles something the system already knows (a customer's due, a
 * supplier's bill) is written as a real customer / supplier payment, so the
 * Customers and Suppliers pages show it too. New goods baki is a real sale or
 * purchase, not a second money line. Old handwritten goods rows stay as they are.
 */
export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const partyType = cleanType(body.partyType);
    const amount = round(body.amount);
    const direction = body.direction === "take" ? "take" : "give";
    const kind = body.kind === "goods" ? "goods" : "money";
    const date = body.date ? new Date(body.date) : new Date();
    const note = String(body.note || "").trim().slice(0, 300);
    const createdBy = actorName(auth);

    if (!mongoose.isValidObjectId(body.partyId)) {
      return NextResponse.json({ success: false, message: "Choose a customer or supplier" }, { status: 400 });
    }
    if (!(amount > 0)) {
      return NextResponse.json({ success: false, message: "Enter an amount greater than 0" }, { status: 400 });
    }
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ success: false, message: "The date is invalid" }, { status: 400 });
    }

    const party = await partyModel(partyType).findById(body.partyId).lean();
    if (!party) return NextResponse.json({ success: false, message: "Party not found" }, { status: 404 });

    if (kind === "goods") {
      return saveGoodsBaki({ req, party, partyType, body, date, note });
    }

    const done = []; // what was written, for the message
    let rest = amount; // what is left for a Telekhata line

    // The shop this entry is written at. It decides two things: how much of
    // the money settles a due here rather than becoming an advance, and which
    // shop's book the receipt lands in. Without it a payment taken at one
    // shop could pay off another shop's due, and the two screens would drift
    // apart again.
    const shop = String(body.showroomId || "warehouse");

    if (kind === "money" && partyType === "customer") {
      const balance = await customerBalance(party, { showroomId: shop });

      if (direction === "take") {
        // money in: first their due, then an advance
        const owes = Math.max(0, balance.due);
        const pay = round(Math.min(rest, owes));
        if (pay > 0) {
          const allocations = share(await customerDue(party._id), pay, "orderId");
          await createCustomerPayment({ customer: party, type: "receive", body: { amount: pay, note, date, method: "cash", allocations, showroomId: shop }, createdBy });
          done.push(`বাকি আদায় ${pay}`);
          rest = round(rest - pay);
        }
        if (rest > 0.009) {
          await createCustomerPayment({ customer: party, type: "advance", body: { amount: rest, note, date, method: "cash", showroomId: shop }, createdBy });
          done.push(`অগ্রিম ${rest}`);
          rest = 0;
        }
      } else {
        // money out: give back what the shop owes them; a fresh credit stays here
        const owed = Math.max(0, -balance.due);
        const pay = round(Math.min(rest, owed));
        if (pay > 0) {
          await createCustomerPayment({ customer: party, type: "pay", body: { amount: pay, note, date, method: "cash", showroomId: shop }, createdBy });
          done.push(`টাকা ফেরত ${pay}`);
          rest = round(rest - pay);
        }
      }
    }

    if (kind === "money" && partyType === "supplier") {
      const balance = await supplierBalance(party, { showroomId: shop });

      if (direction === "give") {
        // money out: first their bills, then an advance
        const owes = Math.max(0, balance.due);
        const pay = round(Math.min(rest, owes));
        if (pay > 0) {
          const allocations = share(await supplierDue(party._id), pay, "purchaseId");
          await createSupplierPayment({ supplier: party, type: "pay", body: { amount: pay, note, date, method: "cash", allocations, showroomId: shop }, createdBy });
          done.push(`বিল পরিশোধ ${pay}`);
          rest = round(rest - pay);
        }
        if (rest > 0.009) {
          await createSupplierPayment({ supplier: party, type: "advance", body: { amount: rest, note, date, method: "cash", showroomId: shop }, createdBy });
          done.push(`অগ্রিম ${rest}`);
          rest = 0;
        }
      } else {
        // money in: what the supplier owes the shop; a fresh credit stays here
        const owed = Math.max(0, -balance.due);
        const pay = round(Math.min(rest, owed));
        if (pay > 0) {
          await createSupplierPayment({ supplier: party, type: "receive", body: { amount: pay, note, date, method: "cash", showroomId: shop }, createdBy });
          done.push(`টাকা ফেরত পাওয়া ${pay}`);
          rest = round(rest - pay);
        }
      }
    }

    if (rest > 0.009) {
      await KhataEntry.create({
        partyType,
        partyId: body.partyId,
        direction,
        kind,
        amount: rest,
        note,
        photo: String(body.photo || "").trim().slice(0, 500),
        date,
        showroomId: shop,
        createdBy,
      });
      done.push(kind === "goods" ? `পণ্য বাকি ${rest}` : `বাকি ${rest}`);
    }

    return NextResponse.json({ success: true, message: `এন্ট্রি সেভ হয়েছে: ${done.join(" + ")}`, saved: done });
  } catch (error) {
    console.error("TELEKHATA ENTRY ERROR:", error);
    return NextResponse.json({ success: false, message: error.message || "Could not save the entry" }, { status: 500 });
  }
}

/** Removes one Telekhata line (soft delete). Sales, purchases and payments are removed on their own pages. */
export async function DELETE(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const id = new URL(req.url).searchParams.get("id");
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid entry" }, { status: 400 });
    }

    const result = await KhataEntry.updateOne({ _id: id, deletedAt: null }, { $set: { deletedAt: new Date() } });
    if (!result.modifiedCount) {
      return NextResponse.json({ success: false, message: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Entry removed" });
  } catch (error) {
    console.error("TELEKHATA DELETE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not remove the entry" }, { status: 500 });
  }
}

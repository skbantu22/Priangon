import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import Supplier from "@/models/Supplier.model";
import Employee from "@/models/Employee.model";
import KhataParty from "@/models/KhataParty.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { TYPES, cleanType, unifiedBook } from "@/lib/telekhata";

// The three tabs of Baki Khata. Everyone has a name and a phone; only the model differs.
const sources = {
  customer: { Model: Customer, phone: "phone", filter: () => ({}) },
  supplier: { Model: Supplier, phone: "phone", filter: () => ({ deletedAt: null }) },
  employee: { Model: Employee, phone: "mobile", filter: () => ({ deletedAt: null }) },
};

// Baki Khata list: every customer / supplier / employee with their balance, plus the
// Pabo / Dibo totals. The balance is one figure: the sales, purchases and payments
// already in the system plus the lines written in Telekhata.
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const partyType = cleanType(searchParams.get("type"));
    const search = (searchParams.get("search") || "").trim();
    // the shop switch at the top, so the book splits per shop like the rest
    const showroomId = searchParams.get("showroomId") || "warehouse";

    const { Model, phone, filter } = sources[partyType];
    const query = filter();

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [{ name: pattern }, { [phone]: pattern }];
    }

    const [people, { book, totals }, counts] = await Promise.all([
      Model.find(query).select(`name ${phone} photo${partyType === "customer" ? " type" : ""}`).sort({ name: 1 }).limit(2000).lean(),
      unifiedBook(showroomId),
      Promise.all(TYPES.map((type) => sources[type].Model.countDocuments(sources[type].filter()))),
    ]);

    const parties = people
      .map((person) => {
        const row = book.get(`${partyType}:${person._id}`);
        return {
          _id: String(person._id),
          name: person.name,
          phone: person[phone] || "",
          photo: person.photo || "",
          type: person.type || "",
          balance: row?.balance || 0,
          last: row?.last || null,
        };
      })
      // people with a balance first, biggest first; the rest follow by name
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance) || a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      parties,
      totals,
      counts: { customer: counts[0], supplier: counts[1], employee: counts[2] },
    });
  } catch (error) {
    console.error("TELEKHATA PARTIES ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the khata" }, { status: 500 });
  }
}

/** The payment date a party promised (the "select payment date" row of a statement) */
export async function PUT(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const partyType = TYPES.includes(body.partyType) ? body.partyType : null;
    const dueDate = body.dueDate ? new Date(body.dueDate) : null;

    if (!partyType || !mongoose.isValidObjectId(body.partyId)) {
      return NextResponse.json({ success: false, message: "Choose a party" }, { status: 400 });
    }
    if (dueDate && Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ success: false, message: "The date is invalid" }, { status: 400 });
    }

    await KhataParty.updateOne(
      { partyType, partyId: body.partyId, showroomId: String(body.showroomId || "warehouse") },
      { $set: { dueDate } },
      { upsert: true },
    );

    return NextResponse.json({ success: true, message: "Saved" });
  } catch (error) {
    console.error("TELEKHATA DUE DATE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not save the date" }, { status: 500 });
  }
}

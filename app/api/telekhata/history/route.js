import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import Supplier from "@/models/Supplier.model";
import Employee from "@/models/Employee.model";
import KhataEntry from "@/models/KhataEntry.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { bookMatch } from "@/lib/telekhata";

// "Baki history": the latest lines of the whole book, newest first
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const showroomId = new URL(req.url).searchParams.get("showroomId") || "";

    const lines = await KhataEntry.find({ deletedAt: null, ...bookMatch(showroomId) })
      .sort({ date: -1, createdAt: -1 })
      .limit(200)
      .lean();

    const ids = (type) => [...new Set(lines.filter((line) => line.partyType === type).map((line) => String(line.partyId)))];
    const [customers, suppliers, employees] = await Promise.all([
      Customer.find({ _id: { $in: ids("customer") } }).select("name").lean(),
      Supplier.find({ _id: { $in: ids("supplier") } }).select("name").lean(),
      Employee.find({ _id: { $in: ids("employee") } }).select("name").lean(),
    ]);
    const names = new Map([...customers, ...suppliers, ...employees].map((row) => [String(row._id), row.name]));

    return NextResponse.json({
      success: true,
      rows: lines.map((line) => ({
        _id: String(line._id),
        partyType: line.partyType,
        partyId: String(line.partyId),
        name: names.get(String(line.partyId)) || "—",
        direction: line.direction,
        kind: line.kind,
        amount: line.amount,
        note: line.note,
        date: line.date,
      })),
    });
  } catch (error) {
    console.error("TELEKHATA HISTORY ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the history" }, { status: 500 });
  }
}

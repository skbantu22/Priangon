import { NextResponse } from "next/server";

import Bank from "@/models/Bank.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { accountScope } from "@/lib/accounts";

// Banks of the selected shop
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const shop = await accountScope(auth, new URL(req.url).searchParams.get("showroomId"));
    const data = await Bank.find({ showroomId: shop, deletedAt: null }).sort({ name: 1 }).lean();

    return NextResponse.json({ success: true, data: data.map((bank) => ({ ...bank, _id: String(bank._id) })) });
  } catch (error) {
    console.error("BANKS ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the banks" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) return NextResponse.json({ success: false, message: "Enter the bank name" }, { status: 400 });

    const shop = await accountScope(auth, body.showroomId);
    const clash = await Bank.findOne({ showroomId: shop, name: new RegExp(`^${escapeRegex(name)}$`, "i"), deletedAt: null }).lean();
    if (clash) return NextResponse.json({ success: false, message: "This bank already exists" }, { status: 409 });

    const bank = await Bank.create({
      name,
      branch: String(body.branch || "").trim(),
      address: String(body.address || "").trim(),
      phone: String(body.phone || "").trim(),
      showroomId: shop,
    });

    return NextResponse.json({ success: true, message: "Bank added", data: bank }, { status: 201 });
  } catch (error) {
    console.error("BANK CREATE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not add the bank" }, { status: 500 });
  }
}

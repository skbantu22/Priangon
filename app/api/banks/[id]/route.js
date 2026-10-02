import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Bank from "@/models/Bank.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";

const find = async (id) => (mongoose.isValidObjectId(id) ? Bank.findOne({ _id: id, deletedAt: null }) : null);

export async function PUT(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const bank = await find(id);
    if (!bank) return NextResponse.json({ success: false, message: "Bank not found" }, { status: 404 });

    const body = await req.json();
    const name = String(body.name ?? bank.name).trim().slice(0, 80);
    if (!name) return NextResponse.json({ success: false, message: "Enter the bank name" }, { status: 400 });

    bank.name = name;
    if (body.branch !== undefined) bank.branch = String(body.branch).trim();
    if (body.address !== undefined) bank.address = String(body.address).trim();
    if (body.phone !== undefined) bank.phone = String(body.phone).trim();
    if (body.isActive !== undefined) bank.isActive = Boolean(body.isActive);
    await bank.save();

    return NextResponse.json({ success: true, message: "Bank updated" });
  } catch (error) {
    console.error("BANK UPDATE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not update the bank" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const bank = await find(id);
    if (!bank) return NextResponse.json({ success: false, message: "Bank not found" }, { status: 404 });

    bank.deletedAt = new Date();
    await bank.save();

    return NextResponse.json({ success: true, message: "Bank deleted" });
  } catch (error) {
    console.error("BANK DELETE ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not delete the bank" }, { status: 500 });
  }
}

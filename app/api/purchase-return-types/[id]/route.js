import mongoose from "mongoose";
import { NextResponse } from "next/server";

import PurchaseReturnType from "@/models/PurchaseReturnType.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

async function load(params) {
  const auth = await requirePermission("purchase.return");
  if (auth.response) return { response: auth.response };

  await connectDB();

  const { id } = await params;

  const type = mongoose.isValidObjectId(id)
    ? await PurchaseReturnType.findOne({ _id: id, deletedAt: null })
    : null;

  if (!type) {
    return {
      response: NextResponse.json(
        { success: false, message: "Return type not found" },
        { status: 404 },
      ),
    };
  }

  return { type };
}

export async function PUT(req, { params }) {
  try {
    const { type, response } = await load(params);
    if (response) return response;

    const name = String((await req.json()).name || "").trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Enter a return type" }, { status: 400 });
    }

    if (
      await PurchaseReturnType.exists({ _id: { $ne: type._id }, name: exactRegex(name), deletedAt: null })
    ) {
      return NextResponse.json(
        { success: false, message: "This return type already exists" },
        { status: 409 },
      );
    }

    type.name = name;
    await type.save();

    // saved returns keep the name they were made with, like a printed note
    return NextResponse.json({ success: true, message: "Return type updated", data: type });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { type, response } = await load(params);
    if (response) return response;

    type.deletedAt = new Date();
    await type.save();

    return NextResponse.json({ success: true, message: "Return type deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

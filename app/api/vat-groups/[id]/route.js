import { NextResponse } from "next/server";
import mongoose from "mongoose";

import VatGroupModel from "@/models/VatGroup.model";
import ProductModel from "@/models/Product.model";
import { connectDB } from "@/lib/databaseconnection";
import { exactRegex } from "@/lib/escapeRegex";
import { ADMIN_ONLY, requireRoles } from "@/lib/apiAuth";
import { readVatGroup } from "@/lib/vatGroups";

const fail = (message, status = 400) => NextResponse.json({ success: false, message }, { status });

// PUT { name, percent }
export async function PUT(req, { params }) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return fail("VAT group not found", 404);

    const group = readVatGroup(await req.json());
    if (group.error) return fail(group.error);
    if (await VatGroupModel.exists({ _id: { $ne: id }, name: exactRegex(group.name), deletedAt: null })) {
      return fail("A group with this name already exists", 409);
    }

    const updated = await VatGroupModel.findOneAndUpdate({ _id: id, deletedAt: null }, group, { new: true });
    if (!updated) return fail("VAT group not found", 404);
    return NextResponse.json({ success: true, message: "VAT group updated", data: updated });
  } catch (error) {
    return fail(error.message, 500);
  }
}

// DELETE: products in the group are left without one
export async function DELETE(req, { params }) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return fail("VAT group not found", 404);

    const removed = await VatGroupModel.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date() });
    if (!removed) return fail("VAT group not found", 404);
    await ProductModel.updateMany({ vatGroup: id }, { $set: { vatGroup: null } });

    return NextResponse.json({ success: true, message: "VAT group deleted" });
  } catch (error) {
    return fail(error.message, 500);
  }
}

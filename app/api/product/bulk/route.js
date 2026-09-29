import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { connectDB } from "@/lib/databaseconnection";
import ProductModel from "@/models/Product.model";

// Bulk actions from the product list: { ids: [...], action }
const ACTIONS = {
  "web-on": { showInWebsite: true },
  "web-off": { showInWebsite: false },
  trash: { deletedAt: new Date() },
  restore: { deletedAt: null },
};

export async function PUT(request) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { ids = [], action } = await request.json();
    const validIds = (Array.isArray(ids) ? ids : []).filter((id) =>
      mongoose.Types.ObjectId.isValid(id),
    );

    if (!validIds.length || !Object.hasOwn(ACTIONS, action)) {
      return NextResponse.json({ success: false, message: "Nothing to update" }, { status: 400 });
    }

    const update = action === "trash" ? { deletedAt: new Date() } : ACTIONS[action];
    const result = await ProductModel.updateMany({ _id: { $in: validIds } }, { $set: update });

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} product(s) updated`,
    });
  } catch (error) {
    console.error("PRODUCT BULK ERROR:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SaleReturn from "@/models/SaleReturn.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { deleteSaleReturn } from "@/lib/saleReturnService";

/** Takes a sales return back: the goods leave stock again and its refund is removed */
export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("orders.delete");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const ret = mongoose.isValidObjectId(id) ? await SaleReturn.findOne({ _id: id, deletedAt: null }) : null;

    if (!ret) return NextResponse.json({ success: false, message: "Return not found" }, { status: 404 });

    await deleteSaleReturn(ret, await actorFullName(auth));

    return NextResponse.json({ success: true, message: `${ret.returnNumber} deleted` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

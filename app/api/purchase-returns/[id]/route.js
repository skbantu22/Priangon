import mongoose from "mongoose";
import { NextResponse } from "next/server";

import PurchaseReturn from "@/models/PurchaseReturn.model";
import SupplierPayment from "@/models/SupplierPayment.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { deletePurchaseReturn } from "@/lib/purchaseReturnService";

async function find(params) {
  const { id } = await params;

  return mongoose.isValidObjectId(id) ? PurchaseReturn.findOne({ _id: id, deletedAt: null }) : null;
}

const notFound = () =>
  NextResponse.json({ success: false, message: "Purchase return not found" }, { status: 404 });

export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("purchase.view");
    if (auth.response) return auth.response;

    await connectDB();

    const ret = await find(params);
    if (!ret) return notFound();

    await ret.populate("supplierId", "name companyName phone email address");

    const refund = ret.refundPaymentId
      ? await SupplierPayment.findOne({ _id: ret.refundPaymentId, deletedAt: null })
          .select("invoiceNo amount method date")
          .lean()
      : null;

    return NextResponse.json({ success: true, data: { ...ret.toObject(), refund } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("purchase.cancel");
    if (auth.response) return auth.response;

    await connectDB();

    const ret = await find(params);
    if (!ret) return notFound();

    await deletePurchaseReturn(ret, await actorFullName(auth));

    return NextResponse.json({
      success: true,
      message: `${ret.returnNumber} deleted; the goods are back in stock`,
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

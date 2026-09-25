import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SupplierPayment from "@/models/SupplierPayment.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { deleteSupplierPayment } from "@/lib/supplierService";

import "@/models/Supplier.model";

const findPayment = (id) =>
  mongoose.isValidObjectId(id) ? SupplierPayment.findOne({ _id: id, deletedAt: null }) : null;

/** One receipt, for the view dialog */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("suppliers.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    const payment = await findPayment(id)
      ?.populate({ path: "supplierId", select: "name phone companyName address email" })
      .lean();

    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Deletes a receipt; the supplier's due and the purchases move back */
export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("purchase.payment");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    const payment = await findPayment(id);

    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    try {
      await deleteSupplierPayment(payment);
    } catch (blockedError) {
      return NextResponse.json({ success: false, message: blockedError.message }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: `${payment.invoiceNo} deleted` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

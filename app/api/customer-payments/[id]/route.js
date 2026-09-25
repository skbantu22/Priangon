import mongoose from "mongoose";
import { NextResponse } from "next/server";

import CustomerPayment from "@/models/CustomerPayment.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { deleteCustomerPayment } from "@/lib/customerService";

import "@/models/Customer.model";

const findPayment = (id) =>
  mongoose.isValidObjectId(id) ? CustomerPayment.findOne({ _id: id, deletedAt: null }) : null;

/** One receipt, for the view dialog */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("customers.due");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    const payment = await findPayment(id)
      ?.populate({ path: "customerId", select: "name phone businessName address email" })
      .lean();

    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: payment });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/** Deletes a receipt; the customer's due and the invoices move back */
export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("customers.payment");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;
    const payment = await findPayment(id);

    if (!payment) {
      return NextResponse.json({ success: false, message: "Payment not found" }, { status: 404 });
    }

    try {
      await deleteCustomerPayment(payment);
    } catch (blockedError) {
      return NextResponse.json({ success: false, message: blockedError.message }, { status: 409 });
    }

    return NextResponse.json({ success: true, message: `${payment.invoiceNo} deleted` });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

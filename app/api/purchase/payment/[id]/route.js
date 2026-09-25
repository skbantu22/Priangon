import { NextResponse } from "next/server";
import PurchaseModel from "@/models/Purchase.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";

export async function POST(req, { params }) {
  try {
    const auth = await requirePermission("purchase.payment");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json();

    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Enter a payment amount" },
        { status: 400 },
      );
    }

    const purchase = await PurchaseModel.findOne({ _id: id, deletedAt: null });

    if (!purchase) {
      return NextResponse.json(
        { success: false, message: "Purchase not found" },
        { status: 404 },
      );
    }

    if (purchase.status === "cancelled") {
      return NextResponse.json(
        { success: false, message: "A cancelled purchase cannot take payment" },
        { status: 409 },
      );
    }

    if (amount > purchase.dueAmount) {
      return NextResponse.json(
        {
          success: false,
          message: `Only ${purchase.dueAmount} is due on this purchase`,
        },
        { status: 400 },
      );
    }

    purchase.payments.push({
      amount,
      method: ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"].includes(body.method)
        ? body.method
        : "cash",
      reference: body.reference?.trim() || "",
      note: body.note?.trim() || "",
      paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
      createdBy: await actorFullName(auth),
    });

    purchase.recalculateTotals();

    await purchase.save();

    return NextResponse.json({
      success: true,
      message: "Payment recorded",
      data: purchase,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SupplierModel from "@/models/Supplier.model";
import SupplierPayment from "@/models/SupplierPayment.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorName, requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { PAYMENT_TYPES, createSupplierPayment } from "@/lib/supplierService";

/** Due Paid / Due Received / Due Dismiss lists */
export async function GET(req) {
  try {
    const auth = await requirePermission("suppliers.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const type = searchParams.get("type");
    const search = (searchParams.get("search") || "").trim();
    const start = searchParams.get("start_date");
    const end = searchParams.get("end_date");
    const showAll = searchParams.get("limit") === "all";
    const limit = Math.min(200, Math.max(10, Number(searchParams.get("limit")) || 10));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const filter = { deletedAt: null };

    if (PAYMENT_TYPES.includes(type)) filter.type = type;

    if (start || end) {
      filter.date = {
        ...(start && { $gte: new Date(`${start}T00:00:00`) }),
        ...(end && { $lte: new Date(`${end}T23:59:59.999`) }),
      };
    }

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      const suppliers = await SupplierModel.find({
        $or: [{ name: pattern }, { companyName: pattern }, { phone: pattern }],
      })
        .select("_id")
        .lean();

      filter.$or = [
        { invoiceNo: pattern },
        { supplierId: { $in: suppliers.map((supplier) => supplier._id) } },
      ];
    }

    const [total, sum] = await Promise.all([
      SupplierPayment.countDocuments(filter),
      SupplierPayment.aggregate([
        { $match: filter },
        { $group: { _id: null, amount: { $sum: "$amount" } } },
      ]),
    ]);

    const size = showAll ? total || 1 : limit;

    const rows = await SupplierPayment.find(filter)
      .populate({ path: "supplierId", select: "name phone companyName" })
      .sort({ date: -1, createdAt: -1 })
      .skip(showAll ? 0 : (page - 1) * size)
      .limit(size)
      .lean();

    return NextResponse.json({
      success: true,
      data: rows,
      summary: { amount: Math.round((sum[0]?.amount || 0) * 100) / 100 },
      total,
      page: showAll ? 1 : page,
      pages: Math.max(1, Math.ceil(total / size)),
      from: total ? (showAll ? 1 : (page - 1) * size + 1) : 0,
    });
  } catch (error) {
    console.error("SUPPLIER PAYMENTS ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load payments" },
      { status: 500 },
    );
  }
}

/**
 * Records a pay, receive, dismiss or advance.
 *
 * The advance screen can pay and refund in one go; each side becomes its
 * own receipt so the lists and the ledger read cleanly.
 */
export async function POST(req) {
  try {
    const auth = await requirePermission("purchase.payment");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const supplier = mongoose.isValidObjectId(body.supplierId)
      ? await SupplierModel.findOne({ _id: body.supplierId, deletedAt: null })
      : null;

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    const type = body.type;
    const createdBy = actorName(auth);

    if (!PAYMENT_TYPES.includes(type)) {
      return NextResponse.json({ success: false, message: "Unknown payment type" }, { status: 400 });
    }

    const saved = [];

    try {
      if (type === "advance") {
        const paying = Number(body.amount) || 0;
        const refund = Number(body.refundAmount) || 0;

        if (paying <= 0 && refund <= 0) throw new Error("Enter an advance or a refund amount");

        if (paying > 0) {
          saved.push(await createSupplierPayment({ supplier, type: "advance", body, createdBy }));
        }

        if (refund > 0) {
          saved.push(
            await createSupplierPayment({
              supplier,
              type: "advance_refund",
              body: { ...body, amount: refund },
              createdBy,
            }),
          );
        }
      } else {
        saved.push(await createSupplierPayment({ supplier, type, body, createdBy }));
      }
    } catch (validationError) {
      return NextResponse.json(
        {
          success: false,
          message: validationError.message,
          ...(saved.length && { saved: saved.map((payment) => payment.invoiceNo) }),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `${saved.map((payment) => payment.invoiceNo).join(", ")} saved`,
      data: saved,
    });
  } catch (error) {
    console.error("SUPPLIER PAYMENT SAVE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not save payment" },
      { status: 500 },
    );
  }
}

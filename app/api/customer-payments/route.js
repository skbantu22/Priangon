import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Customer from "@/models/Customer.model";
import CustomerPayment from "@/models/CustomerPayment.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorName, requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { PAYMENT_TYPES, createCustomerPayment } from "@/lib/customerService";

/** Due Received / Due Paid / Due Dismiss / Advance lists */
export async function GET(req) {
  try {
    const auth = await requirePermission("customers.due");
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

    // the advance list shows advances and their refunds together
    if (type === "advance") filter.type = { $in: ["advance", "advance_refund"] };
    else if (PAYMENT_TYPES.includes(type)) filter.type = type;

    if (start || end) {
      filter.date = {
        ...(start && { $gte: new Date(`${start}T00:00:00`) }),
        ...(end && { $lte: new Date(`${end}T23:59:59.999`) }),
      };
    }

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };

      const customers = await Customer.find({
        $or: [{ name: pattern }, { businessName: pattern }, { phone: pattern }],
      })
        .select("_id")
        .lean();

      filter.$or = [
        { invoiceNo: pattern },
        { customerId: { $in: customers.map((customer) => customer._id) } },
      ];
    }

    const [total, sum] = await Promise.all([
      CustomerPayment.countDocuments(filter),
      CustomerPayment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            // a refund takes an advance back, so it counts against the total
            amount: {
              $sum: { $cond: [{ $eq: ["$type", "advance_refund"] }, { $multiply: ["$amount", -1] }, "$amount"] },
            },
          },
        },
      ]),
    ]);

    const size = showAll ? total || 1 : limit;

    const rows = await CustomerPayment.find(filter)
      .populate({ path: "customerId", select: "name phone businessName type" })
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
    console.error("CUSTOMER PAYMENTS ERROR:", error);

    return NextResponse.json({ success: false, message: "Could not load payments" }, { status: 500 });
  }
}

/**
 * Records a receive, pay, dismiss or advance.
 *
 * The advance screen can take and refund in one go; each side becomes its
 * own receipt so the lists and the ledger read cleanly.
 */
export async function POST(req) {
  try {
    const auth = await requirePermission("customers.payment");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const customer = mongoose.isValidObjectId(body.customerId)
      ? await Customer.findById(body.customerId).lean()
      : null;

    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }

    const type = body.type;
    const createdBy = actorName(auth);

    if (!PAYMENT_TYPES.includes(type)) {
      return NextResponse.json({ success: false, message: "Unknown payment type" }, { status: 400 });
    }

    const saved = [];

    try {
      if (type === "advance") {
        const taking = Number(body.amount) || 0;
        const refund = Number(body.refundAmount) || 0;

        if (taking <= 0 && refund <= 0) throw new Error("Enter an advance or a refund amount");

        if (taking > 0) {
          saved.push(await createCustomerPayment({ customer, type: "advance", body, createdBy }));
        }

        if (refund > 0) {
          saved.push(
            await createCustomerPayment({
              customer,
              type: "advance_refund",
              body: { ...body, amount: refund },
              createdBy,
            }),
          );
        }
      } else {
        saved.push(await createCustomerPayment({ customer, type, body, createdBy }));
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
    console.error("CUSTOMER PAYMENT SAVE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not save payment" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";

/**
 * Expense List: one page of expenses with the filters, plus a summary for
 * the header cards — the filtered total, this month's total and the type
 * the most money went on.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("expenses.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    // find() casts these for us, aggregate() does not — so store them as
    // real ObjectIds, otherwise the totals silently come back as 0
    const categoryId = searchParams.get("categoryId");
    if (mongoose.isValidObjectId(categoryId)) {
      filter.categoryId = new mongoose.Types.ObjectId(categoryId);
    }

    // "head" is head office: expenses not tied to a showroom
    const showroomId = searchParams.get("showroomId");
    if (showroomId === "head") filter.showroomId = null;
    else if (mongoose.isValidObjectId(showroomId)) {
      filter.showroomId = new mongoose.Types.ObjectId(showroomId);
    }

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from || to) {
      filter.expenseDate = {};
      if (from) filter.expenseDate.$gte = new Date(`${from}T00:00:00+06:00`);
      if (to) filter.expenseDate.$lte = new Date(`${to}T23:59:59.999+06:00`);
    }

    const search = searchParams.get("search")?.trim();

    if (search) {
      const regex = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [
        { voucherNumber: regex },
        { title: regex },
        { note: regex },
        { reference: regex },
        { createdBy: regex },
        { categoryName: regex },
        { paymentMethod: regex },
      ];
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 10));

    // this month in Bangladesh, whatever the filter says (branch still applies)
    const nowBD = new Date(Date.now() + 6 * 3600 * 1000);
    const monthStart = new Date(`${nowBD.toISOString().slice(0, 7)}-01T00:00:00+06:00`);
    const monthFilter = { deletedAt: null, expenseDate: { $gte: monthStart } };
    if ("showroomId" in filter) monthFilter.showroomId = filter.showroomId;

    const [expenses, total, totals, top, month] = await Promise.all([
      ExpenseModel.find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("showroomId", "name")
        .lean(),
      ExpenseModel.countDocuments(filter),
      ExpenseModel.aggregate([{ $match: filter }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
      ExpenseModel.aggregate([
        { $match: filter },
        { $group: { _id: "$categoryName", amount: { $sum: "$amount" } } },
        { $sort: { amount: -1 } },
        { $limit: 1 },
      ]),
      ExpenseModel.aggregate([{ $match: monthFilter }, { $group: { _id: null, amount: { $sum: "$amount" } } }]),
    ]);

    return NextResponse.json({
      success: true,
      data: expenses,
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      from: total ? (page - 1) * limit + 1 : 0,
      totalAmount: totals[0]?.amount || 0,
      hasMore: page * limit < total,
      summary: {
        total: totals[0]?.amount || 0,
        count: total,
        thisMonth: month[0]?.amount || 0,
        topType: top[0] ? { name: top[0]._id || "—", total: top[0].amount } : null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

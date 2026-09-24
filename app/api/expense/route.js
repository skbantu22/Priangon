import { NextResponse } from "next/server";
import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";

export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    const categoryId = searchParams.get("categoryId");
    if (categoryId) filter.categoryId = categoryId;

    const showroomId = searchParams.get("showroomId");
    if (showroomId) filter.showroomId = showroomId;

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from || to) {
      filter.expenseDate = {};
      if (from) filter.expenseDate.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        filter.expenseDate.$lte = end;
      }
    }

    const search = searchParams.get("search")?.trim();

    if (search) {
      filter.$or = [
        { voucherNumber: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { reference: { $regex: search, $options: "i" } },
      ];
    }

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Number(searchParams.get("limit")) || 50);

    const [expenses, total, totals] = await Promise.all([
      ExpenseModel.find(filter)
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ExpenseModel.countDocuments(filter),
      ExpenseModel.aggregate([
        { $match: filter },
        { $group: { _id: null, amount: { $sum: "$amount" } } },
      ]),
    ]);

    return NextResponse.json({
      success: true,
      data: expenses,
      page,
      limit,
      total,
      totalAmount: totals[0]?.amount || 0,
      hasMore: page * limit < total,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

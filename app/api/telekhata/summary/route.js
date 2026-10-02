import mongoose from "mongoose";
import { NextResponse } from "next/server";

import POSOrder from "@/models/posorder.model";
import Expense from "@/models/Expense.model";
import KhataEntry from "@/models/KhataEntry.model";
import ShowroomStock from "@/models/ShowroomStock";
import WarehouseStock from "@/models/WarehouseStock.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { bookMatch, tillHomeBalance, round } from "@/lib/telekhata";

// Telekhata home card: balance, sale, expense, baki given / taken and stock count
// for the Day or Month tab of one showroom (or the warehouse).
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const showroomId = searchParams.get("showroomId") || "warehouse";
    const period = searchParams.get("period") === "month" ? "month" : "day";

    const from = new Date();
    from.setHours(0, 0, 0, 0);
    if (period === "month") from.setDate(1);

    const isShowroom = mongoose.isValidObjectId(showroomId);
    const here = isShowroom ? { showroomId: new mongoose.Types.ObjectId(showroomId) } : { showroomId: null };

    const [home, sale, expense, baki, stock] = await Promise.all([
      tillHomeBalance(showroomId),
      POSOrder.aggregate([
        { $match: { status: "completed", createdAt: { $gte: from }, ...here } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$total", 0] } }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { deletedAt: null, expenseDate: { $gte: from }, ...here } },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$amount", 0] } } } },
      ]),
      KhataEntry.aggregate([
        { $match: { deletedAt: null, date: { $gte: from }, ...bookMatch(showroomId) } },
        { $group: { _id: "$direction", total: { $sum: "$amount" } } },
      ]),
      isShowroom
        ? ShowroomStock.aggregate([
            { $match: { showroomId: new mongoose.Types.ObjectId(showroomId) } },
            { $group: { _id: null, total: { $sum: { $ifNull: ["$stock", 0] } } } },
          ])
        : WarehouseStock.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ["$stock", 0] } } } }]),
    ]);

    const sum = (direction) => baki.find((row) => row._id === direction)?.total || 0;

    return NextResponse.json({
      success: true,
      pabo: home.pabo,
      dibo: home.dibo,
      balance: home.balance,
      sale: round(sale[0]?.total || 0),
      saleCount: sale[0]?.count || 0,
      expense: round(expense[0]?.total || 0),
      given: round(sum("give")),
      taken: round(sum("take")),
      stock: Math.round(stock[0]?.total || 0),
    });
  } catch (error) {
    console.error("TELEKHATA SUMMARY ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load the summary" }, { status: 500 });
  }
}

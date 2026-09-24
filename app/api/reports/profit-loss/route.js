import { NextResponse } from "next/server";
import mongoose from "mongoose";

import POSOrderModel from "@/models/posorder.model";
import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

/**
 * Sales against what those goods cost, minus running expenses.
 *
 * Cost comes from items[].purchasePrice, which POS stores at the moment
 * of sale, so a later price change never rewrites an old month's profit.
 */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const to = endOfDay(searchParams.get("to") || new Date());

    const defaultFrom = new Date(to);
    defaultFrom.setDate(defaultFrom.getDate() - 29);

    const from = startOfDay(searchParams.get("from") || defaultFrom);

    if (from > to) {
      return NextResponse.json(
        { success: false, message: "From date is after the to date" },
        { status: 400 },
      );
    }

    const orderMatch = {
      status: "completed",
      createdAt: { $gte: from, $lte: to },
    };

    const expenseMatch = {
      deletedAt: null,
      expenseDate: { $gte: from, $lte: to },
    };

    const showroomId = searchParams.get("showroomId");

    if (mongoose.isValidObjectId(showroomId)) {
      const objectId = new mongoose.Types.ObjectId(showroomId);
      orderMatch.showroomId = objectId;
      expenseMatch.showroomId = objectId;
    }

    const [salesRows, cogsRows, expenseRows, dailySales, dailyExpenses] =
      await Promise.all([
        POSOrderModel.aggregate([
          { $match: orderMatch },
          {
            $group: {
              _id: null,
              revenue: { $sum: "$total" },
              discount: { $sum: "$discount" },
              vat: { $sum: "$vat" },
              orders: { $sum: 1 },
              collected: { $sum: "$paidAmount" },
              due: { $sum: "$dueAmount" },
            },
          },
        ]),

        POSOrderModel.aggregate([
          { $match: orderMatch },
          { $unwind: "$items" },
          {
            $group: {
              _id: null,
              cogs: {
                $sum: {
                  $multiply: [
                    "$items.qty",
                    { $ifNull: ["$items.purchasePrice", 0] },
                  ],
                },
              },
              unitsSold: { $sum: "$items.qty" },
              missingCost: {
                $sum: {
                  $cond: [
                    { $gt: [{ $ifNull: ["$items.purchasePrice", 0] }, 0] },
                    0,
                    "$items.qty",
                  ],
                },
              },
            },
          },
        ]),

        ExpenseModel.aggregate([
          { $match: expenseMatch },
          {
            $group: {
              _id: "$categoryName",
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { amount: -1 } },
        ]),

        POSOrderModel.aggregate([
          { $match: orderMatch },
          { $unwind: "$items" },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
              },
              cogs: {
                $sum: {
                  $multiply: [
                    "$items.qty",
                    { $ifNull: ["$items.purchasePrice", 0] },
                  ],
                },
              },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        ExpenseModel.aggregate([
          { $match: expenseMatch },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$expenseDate" },
              },
              amount: { $sum: "$amount" },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    // Revenue per day is grouped separately so unwinding items above
    // cannot multiply an order's total across its rows
    const dailyRevenue = await POSOrderModel.aggregate([
      { $match: orderMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const sales = salesRows[0] || {
      revenue: 0,
      discount: 0,
      vat: 0,
      orders: 0,
      collected: 0,
      due: 0,
    };

    const cogsRow = cogsRows[0] || { cogs: 0, unitsSold: 0, missingCost: 0 };

    const totalExpense = expenseRows.reduce((sum, row) => sum + row.amount, 0);

    const grossProfit = sales.revenue - cogsRow.cogs;
    const netProfit = grossProfit - totalExpense;

    const cogsByDay = new Map(dailySales.map((row) => [row._id, row.cogs]));
    const expenseByDay = new Map(
      dailyExpenses.map((row) => [row._id, row.amount]),
    );

    const days = new Set([
      ...dailyRevenue.map((row) => row._id),
      ...expenseByDay.keys(),
    ]);

    const daily = [...days]
      .sort()
      .map((day) => {
        const revenue =
          dailyRevenue.find((row) => row._id === day)?.revenue || 0;
        const cogs = cogsByDay.get(day) || 0;
        const expense = expenseByDay.get(day) || 0;

        return {
          date: day,
          revenue,
          cogs,
          expense,
          netProfit: revenue - cogs - expense,
        };
      });

    return NextResponse.json({
      success: true,
      range: { from, to },
      summary: {
        revenue: sales.revenue,
        discount: sales.discount,
        vat: sales.vat,
        orders: sales.orders,
        collected: sales.collected,
        due: sales.due,
        cogs: cogsRow.cogs,
        unitsSold: cogsRow.unitsSold,
        grossProfit,
        grossMargin: sales.revenue > 0 ? (grossProfit / sales.revenue) * 100 : 0,
        totalExpense,
        netProfit,
        netMargin: sales.revenue > 0 ? (netProfit / sales.revenue) * 100 : 0,
      },
      // Units sold without a recorded cost make the profit look larger
      // than it is, so the page can warn instead of quietly overstating
      warnings: {
        unitsWithoutCost: cogsRow.missingCost,
      },
      expensesByCategory: expenseRows.map((row) => ({
        category: row._id || "Uncategorised",
        amount: row.amount,
        count: row.count,
      })),
      daily,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

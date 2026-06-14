import { connectDB } from "@/lib/databaseconnection";
import Order from "@/models/Order.model";

export async function GET() {
  try {
    await connectDB();

    // ✅ FIXED: safe timezone-friendly start of day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    // ✅ FIXED: start of month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [todayOrders, totalOrders, todaySales, monthlySales, totalSales] =
      await Promise.all([
        // 📦 Today Orders
        Order.countDocuments({
          createdAt: { $gte: startOfDay },
        }),

        // 📦 Total Orders
        Order.countDocuments(),

        // 💰 Today Sales
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfDay },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$total" },
            },
          },
        ]),

        // 💰 Monthly Sales
        Order.aggregate([
          {
            $match: {
              createdAt: { $gte: startOfMonth },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$total" },
            },
          },
        ]),

        // 💰 Total Sales (All time)
        Order.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: "$total" },
            },
          },
        ]),
      ]);

    return Response.json({
      success: true,
      data: {
        todayOrders: todayOrders || 0,
        totalOrders: totalOrders || 0,
        todaySales: todaySales?.[0]?.total || 0,
        monthlySales: monthlySales?.[0]?.total || 0,
        totalSales: totalSales?.[0]?.total || 0,
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}

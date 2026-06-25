import { connectDB } from "@/lib/databaseconnection";
import Order from "@/models/Order.model";
import User from "@/models/User.model";

export async function GET(req) {
  await connectDB();

  const { searchParams } = new URL(req.url);

  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let dateFilter = {};

  // ================= MONTH FILTER =================
  if (month) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    dateFilter.createdAt = {
      $gte: start,
      $lt: end,
    };
  }

  // ================= DATE RANGE FILTER =================
  if (from && to) {
    dateFilter.createdAt = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  // ================= AGGREGATION =================
  const data = await Order.aggregate([
    // 1. filter by date first
    {
      $match: dateFilter,
    },

    // 2. group by userId (IMPORTANT FIX)
    {
      $group: {
        _id: "$userId",

        totalOrders: { $sum: 1 },

        delivered: {
          $sum: {
            $cond: [{ $eq: ["$status", "delivered"] }, 1, 0],
          },
        },

        cancelled: {
          $sum: {
            $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
          },
        },

        totalRevenue: {
          $sum: "$total",
        },
      },
    },

    // 3. join user data
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },

    // 4. flatten user
    {
      $unwind: "$user",
    },

    // 5. ONLY MODERATORS FILTER (IMPORTANT FIX)
    {
      $match: {
        "user.role": "moderator",
      },
    },

    // 6. final output
    {
      $project: {
        _id: 1,
        totalOrders: 1,
        delivered: 1,
        cancelled: 1,
        totalRevenue: 1,
        name: "$user.name",
        email: "$user.email",
      },
    },
  ]);

  return Response.json({
    success: true,
    data,
  });
}

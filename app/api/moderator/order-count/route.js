import { connectDB } from "@/lib/databaseconnection";
import Order from "@/models/Order.model";
import User from "@/models/User.model";
import { response } from "@/lib/helperfunction";
import mongoose from "mongoose";

export async function GET() {
  try {
    await connectDB();

    // 1️⃣ Get all moderators
    const moderators = await User.find({
      role: "moderator",
      deletedAt: null,
    }).select("_id name email");

    // 2️⃣ Build report for each moderator
    const result = await Promise.all(
      moderators.map(async (mod) => {
        const stats = await Order.aggregate([
          {
            $match: {
              createdBy: new mongoose.Types.ObjectId(mod._id),
            },
          },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]);

        let delivered = 0;
        let cancelled = 0;

        stats.forEach((s) => {
          if (s._id === "delivered") delivered = s.count;
          if (s._id === "cancelled") cancelled = s.count;
        });

        return {
          _id: mod._id,
          name: mod.name,
          email: mod.email,
          delivered,
          cancelled,
        };
      }),
    );

    return response(true, 200, "OK", result);
  } catch (error) {
    return response(false, 500, error.message);
  }
}

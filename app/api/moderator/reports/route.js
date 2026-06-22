import { connectDB } from "@/lib/databaseconnection";
import Order from "@/models/Order.model";
import User from "@/models/User.model";

export async function GET() {
  await connectDB();

  // 1. get all moderators
  const moderators = await User.find({ role: "moderator" });

  const result = await Promise.all(
    moderators.map(async (mod) => {
      const totalOrders = await Order.countDocuments({
        createdBy: mod._id,
      });

      const delivered = await Order.countDocuments({
        createdBy: mod._id,
        status: "delivered",
      });

      const cancelled = await Order.countDocuments({
        createdBy: mod._id,
        status: "cancelled",
      });

      return {
        _id: mod._id,
        name: mod.name,
        email: mod.email,
        totalOrders,
        delivered,
        cancelled,
      };
    }),
  );

  return Response.json({
    success: true,
    data: result,
  });
}

import { NextResponse } from "next/server";
import Order from "@/models/Order.model";
import Track from "@/models/OrderTrack.model";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("query"); // Use a general 'query' param
    const phone = searchParams.get("phone");

    if (!searchQuery || !phone) {
      return NextResponse.json(
        { message: "Search details and phone required" },
        { status: 400 },
      );
    }

    // Check if the searchQuery is a valid MongoDB ObjectId
    const isObjectId = mongoose.Types.ObjectId.isValid(searchQuery);

    // 1. Search by Order Number OR Order ID, but MUST match Phone
    const order = await Order.findOne({
      $and: [
        { "customer.phone": phone },
        {
          $or: [
            { orderNumber: { $regex: new RegExp(`^${searchQuery}$`, "i") } },
            ...(isObjectId ? [{ _id: searchQuery }] : []),
          ],
        },
      ],
    }).select("_id status orderNumber");

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    // 2. Fetch the history using the found Order's internal _id
    const history = await Track.find({ orderId: order._id }).sort({
      createdAt: -1,
    });

    return NextResponse.json({
      currentStatus: order.status,
      orderNumber: order.orderNumber,
      orderId: order._id,
      history,
    });
  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

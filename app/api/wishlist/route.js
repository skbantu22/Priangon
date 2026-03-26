import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import WishlistModel from "@/models/wishlist.model";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, productId } = body;

    // ✅ Validation
    if (!userId || !productId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId and productId are required",
        },
        { status: 400 },
      );
    }

    // ✅ Check existing
    const exist = await WishlistModel.findOne({ userId, productId });

    if (exist) {
      await WishlistModel.deleteOne({ _id: exist._id });

      return NextResponse.json({
        success: true,
        message: "Removed from wishlist",
        removed: true,
      });
    }

    // ✅ Prevent duplicate (extra safety)
    const wishlist = await WishlistModel.findOneAndUpdate(
      { userId, productId },
      { userId, productId },
      { upsert: true, new: true },
    );

    return NextResponse.json({
      success: true,
      message: "Added to wishlist",
      data: wishlist,
    });
  } catch (error) {
    console.log("Wishlist Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Server error",
      },
      { status: 500 },
    );
  }
}

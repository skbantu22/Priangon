import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import WishlistModel from "@/models/wishlist.model";

export async function POST(req) {
  try {
    await connectDB();

    const { userId, productId } = await req.json();

    const exist = await WishlistModel.findOne({ userId, productId });

    if (exist) {
      await WishlistModel.deleteOne({ _id: exist._id });

      return NextResponse.json({
        success: true,
        message: "Removed from wishlist",
        removed: true,
      });
    }

    const wishlist = await WishlistModel.create({
      userId,
      productId,
    });

    return NextResponse.json({
      success: true,
      message: "Added to wishlist",
      data: wishlist,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}
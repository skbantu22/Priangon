import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import WishlistModel from "@/models/wishlist.model";

// ============================
// ✅ GET Wishlist by User
// ============================
export async function GET(req) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID required" },
        { status: 400 },
      );
    }

    // 🔥 convert to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const wishlistItems = await WishlistModel.find({
      userId: userObjectId,
    }).populate({
      path: "productId",
      select: "_id name slug sellingPrice media",
      populate: {
        path: "media",
        select: "secure_url",
      },
    });

    return NextResponse.json({
      success: true,
      data: wishlistItems,
    });
  } catch (error) {
    console.error("GET Wishlist Error:", error);

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

// ============================
// ✅ ADD / REMOVE (Toggle)
// ============================
export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, productId } = body;

    if (!userId || !productId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId and productId are required",
        },
        { status: 400 },
      );
    }

    // 🔥 convert to ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    // ✅ check exist
    const exist = await WishlistModel.findOne({
      userId: userObjectId,
      productId: productObjectId,
    });

    // ========================
    // ❌ REMOVE
    // ========================
    if (exist) {
      await WishlistModel.deleteOne({
        userId: userObjectId,
        productId: productObjectId,
      });

      return NextResponse.json({
        success: true,
        message: "Removed from wishlist",
        removed: true,
      });
    }

    // ========================
    // ➕ ADD
    // ========================
    const wishlist = await WishlistModel.create({
      userId: userObjectId,
      productId: productObjectId,
    });

    return NextResponse.json({
      success: true,
      message: "Added to wishlist",
      data: wishlist,
    });
  } catch (error) {
    console.error("POST Wishlist Error:", error);

    // 🔥 handle duplicate error
    if (error.code === 11000) {
      return NextResponse.json({
        success: true,
        message: "Already exists (duplicate prevented)",
      });
    }

    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 },
    );
  }
}

// app/api/banner/route.js

import { connectDB } from "@/lib/databaseconnection";
import BannerModel from "@/models/Banner.model";
import MediaModel from "@/models/Media.model";

export const GET = async () => {
  await connectDB();

  try {
    const banners = await BannerModel.find({ deletedAt: null })
      .populate("pcImage")
      .populate("mobileImage")
      .sort({ order: 1 });

    return Response.json(
      {
        success: true,
        data: banners,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Banner fetch error:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to fetch banners",
      },
      { status: 500 }
    );
  }
};
// app/api/banner/route.js

import { connectDB } from "@/lib/databaseconnection";
import BannerModel from "@/models/Banner.model";

export const POST = async (req) => {
  await connectDB();

  try {
    const body = await req.json();

    const { name, link = "", order = 0, pcImage, mobileImage } = body;

    if (!name || !pcImage || !mobileImage) {
      return Response.json(
        { message: "Required fields missing" },
        { status: 400 }
      );
    }

    const banner = await BannerModel.create({
      name,
      link,
      order: Number(order),
      pcImage,      // media _id
      mobileImage,  // media _id
    });

    return Response.json(
      { success: true, data: banner },
      { status: 201 }
    );

  } catch (error) {
    console.error("Banner create error:", error);

    return Response.json(
      { success: false, message: "Failed to create banner" },
      { status: 500 }
    );
  }
};
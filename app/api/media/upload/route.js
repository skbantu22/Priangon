import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

import Media from "@/models/Media.model";
import { connectDB } from "@/lib/databaseconnection";

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({
        success: false,
        message: "No file uploaded",
      });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "products",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(buffer);
    });

    // SAVE TO MONGODB
    const media = await Media.create({
      asset_id: uploadResult.asset_id,
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      thumbnail_url: uploadResult.secure_url,
      path: uploadResult.url,
    });

    return NextResponse.json({
      success: true,
      message: "Uploaded successfully",
      media,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json({
      success: false,
      message: error.message,
    });
  }
}

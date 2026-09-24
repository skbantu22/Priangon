import { NextResponse } from "next/server";
import AttributeModel from "@/models/Attribute.model";
import { connectDB } from "@/lib/databaseconnection";

export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const attribute = await AttributeModel.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!attribute) {
      return NextResponse.json(
        { success: false, message: "Attribute not found" },
        { status: 404 },
      );
    }

    // Variants store the chosen value as plain text, so deleting an
    // attribute never breaks an existing variant — it only stops the
    // value being offered on new ones
    attribute.deletedAt = new Date();
    await attribute.save();

    return NextResponse.json({
      success: true,
      message: "Attribute moved to trash",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

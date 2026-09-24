import { NextResponse } from "next/server";
import AttributeModel, { ATTRIBUTE_SLOTS } from "@/models/Attribute.model";
import { connectDB } from "@/lib/databaseconnection";
import { cleanValues } from "../../create/route";

export async function PUT(req, { params }) {
  try {
    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Attribute name is required" },
        { status: 400 },
      );
    }

    const duplicate = await AttributeModel.findOne({
      _id: { $ne: id },
      name: new RegExp(`^${name}$`, "i"),
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "Another attribute already uses this name" },
        { status: 409 },
      );
    }

    const attribute = await AttributeModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      {
        name,
        slot: ATTRIBUTE_SLOTS.includes(body.slot) ? body.slot : "spec",
        values: cleanValues(body.values),
        isActive: body.isActive !== false,
      },
      { new: true, runValidators: true },
    );

    if (!attribute) {
      return NextResponse.json(
        { success: false, message: "Attribute not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: attribute });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

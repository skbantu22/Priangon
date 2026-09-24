import { NextResponse } from "next/server";
import AttributeModel, { ATTRIBUTE_SLOTS } from "@/models/Attribute.model";
import { connectDB } from "@/lib/databaseconnection";

const cleanValues = (input) => {
  const rows = Array.isArray(input) ? input : [];

  const seen = new Set();
  const values = [];

  rows.forEach((row, index) => {
    const label = String(row.label || "").trim();
    const value = String(row.value || label).trim();

    if (!label || !value) return;

    // Two rows storing the same value would make duplicate variants
    const key = value.toLowerCase();

    if (seen.has(key)) return;

    seen.add(key);
    values.push({ label, value, sortOrder: Number(row.sortOrder) || index });
  });

  return values;
};

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Attribute name is required" },
        { status: 400 },
      );
    }

    const existing = await AttributeModel.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: existing.deletedAt
            ? "This attribute is in the trash. Restore it instead."
            : "Attribute already exists",
        },
        { status: 409 },
      );
    }

    const attribute = await AttributeModel.create({
      name,
      slot: ATTRIBUTE_SLOTS.includes(body.slot) ? body.slot : "spec",
      values: cleanValues(body.values),
      isActive: body.isActive !== false,
    });

    return NextResponse.json(
      { success: true, data: attribute },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Attribute already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

export { cleanValues };

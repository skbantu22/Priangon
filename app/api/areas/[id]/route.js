import mongoose from "mongoose";
import { NextResponse } from "next/server";

import AreaModel from "@/models/Area.model";
import SupplierModel from "@/models/Supplier.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

/** Renames an area or turns it off */
export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission("areas.manage");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Unknown area" }, { status: 400 });
    }

    const body = await req.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Area name is required" },
        { status: 400 },
      );
    }

    const area = await AreaModel.findOne({ _id: id, deletedAt: null });

    if (!area) {
      return NextResponse.json({ success: false, message: "Area not found" }, { status: 404 });
    }

    const duplicate = await AreaModel.findOne({
      _id: { $ne: id },
      name: exactRegex(name),
      showroomId: area.showroomId,
      deletedAt: null,
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "This branch already has that area" },
        { status: 409 },
      );
    }

    const previousName = area.name;

    area.name = name;
    area.note = String(body.note ?? area.note).trim();
    if (body.isActive !== undefined) area.isActive = body.isActive !== false;

    await area.save();

    // Suppliers keep the area by name, so a rename has to follow through
    // or their rows would point at an area that no longer exists
    if (previousName !== name) {
      await SupplierModel.updateMany(
        { area: previousName, deletedAt: null },
        { area: name },
      );
    }

    return NextResponse.json({ success: true, data: area });
  } catch (error) {
    console.error("AREA UPDATE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not save the area" },
      { status: 500 },
    );
  }
}

/** Moves an area to the trash, unless suppliers still sit in it */
export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("areas.manage");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Unknown area" }, { status: 400 });
    }

    const area = await AreaModel.findOne({ _id: id, deletedAt: null });

    if (!area) {
      return NextResponse.json({ success: false, message: "Area not found" }, { status: 404 });
    }

    const inUse = await SupplierModel.countDocuments({
      area: area.name,
      deletedAt: null,
    });

    if (inUse > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${inUse} supplier${inUse === 1 ? " is" : "s are"} still in "${area.name}"`,
        },
        { status: 409 },
      );
    }

    area.deletedAt = new Date();
    await area.save();

    return NextResponse.json({ success: true, message: `"${area.name}" deleted` });
  } catch (error) {
    console.error("AREA DELETE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not delete the area" },
      { status: 500 },
    );
  }
}

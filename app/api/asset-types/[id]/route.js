import mongoose from "mongoose";
import { NextResponse } from "next/server";

import AssetType from "@/models/AssetType.model";
import Asset from "@/models/Asset.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

async function load(params) {
  const auth = await requirePermission("assets.types");
  if (auth.response) return { response: auth.response };

  await connectDB();

  const { id } = await params;

  const type = mongoose.isValidObjectId(id)
    ? await AssetType.findOne({ _id: id, deletedAt: null })
    : null;

  if (!type) {
    return {
      response: NextResponse.json(
        { success: false, message: "Asset type not found" },
        { status: 404 },
      ),
    };
  }

  return { type };
}

export async function PUT(req, { params }) {
  try {
    const { type, response } = await load(params);
    if (response) return response;

    const name = String((await req.json()).name || "").trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Enter an asset type" }, { status: 400 });
    }

    if (
      await AssetType.exists({ _id: { $ne: type._id }, name: exactRegex(name), deletedAt: null })
    ) {
      return NextResponse.json(
        { success: false, message: "This asset type already exists" },
        { status: 409 },
      );
    }

    type.name = name;
    await type.save();

    // Assets keep the name they were saved with; bring them along
    await Asset.updateMany({ typeId: type._id }, { typeName: name });

    return NextResponse.json({ success: true, message: "Asset type updated", data: type });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { type, response } = await load(params);
    if (response) return response;

    const used = await Asset.countDocuments({ typeId: type._id, deletedAt: null });

    if (used > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${used} asset(s) use this type. Move them to another type first.`,
        },
        { status: 409 },
      );
    }

    type.deletedAt = new Date();
    await type.save();

    return NextResponse.json({ success: true, message: "Asset type deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

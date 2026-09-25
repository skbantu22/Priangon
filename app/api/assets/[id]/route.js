import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Asset from "@/models/Asset.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { readAsset } from "@/lib/assetService";

async function load(params, permission) {
  const auth = await requirePermission(permission);
  if (auth.response) return { response: auth.response };

  await connectDB();

  const { id } = await params;

  const asset = mongoose.isValidObjectId(id)
    ? await Asset.findOne({ _id: id, deletedAt: null })
    : null;

  if (!asset) {
    return {
      response: NextResponse.json({ success: false, message: "Asset not found" }, { status: 404 }),
    };
  }

  return { asset };
}

export async function PUT(req, { params }) {
  try {
    const { asset, response } = await load(params, "assets.edit");
    if (response) return response;

    const checked = await readAsset(await req.json());

    if (checked.error) {
      return NextResponse.json({ success: false, message: checked.error }, { status: 400 });
    }

    Object.assign(asset, checked.data);
    await asset.save();

    return NextResponse.json({ success: true, message: "Asset updated", data: asset });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { asset, response } = await load(params, "assets.delete");
    if (response) return response;

    asset.deletedAt = new Date();
    await asset.save();

    return NextResponse.json({ success: true, message: "Asset deleted" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

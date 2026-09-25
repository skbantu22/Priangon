import { NextResponse } from "next/server";

import AssetType from "@/models/AssetType.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

/** Every asset type, for the list and the asset form */
export async function GET() {
  try {
    const auth = await requirePermission("assets.view");
    if (auth.response) return auth.response;

    await connectDB();

    const types = await AssetType.find({ deletedAt: null }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requirePermission("assets.types");
    if (auth.response) return auth.response;

    await connectDB();

    const name = String((await req.json()).name || "").trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Enter an asset type" }, { status: 400 });
    }

    if (await AssetType.exists({ name: exactRegex(name), deletedAt: null })) {
      return NextResponse.json(
        { success: false, message: "This asset type already exists" },
        { status: 409 },
      );
    }

    const type = await AssetType.create({ name });

    return NextResponse.json({ success: true, message: "Asset type saved", data: type });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

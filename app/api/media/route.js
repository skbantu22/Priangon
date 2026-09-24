import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import MediaModel from "@/models/Media.model"; // ✅ path ঠিক করুন
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET(request) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page"), 10) || 0;
    const limit = parseInt(searchParams.get("limit"), 10) || 10;
    const deleteType = searchParams.get("deleteType");

    let filter = {};
    if (deleteType === "SD") filter = { deletedAt: null };
    else if (deleteType === "PD") filter = { deletedAt: { $ne: null } };

    const mediaData = await MediaModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .lean();

    const totalMedia = await MediaModel.countDocuments(filter);

    return NextResponse.json({
      mediaData,
      hasMore: (page + 1) * limit < totalMedia,
    });
  } catch (error) {
    return catchError(error);
  }
}

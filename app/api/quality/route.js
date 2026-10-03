import { NextResponse } from "next/server";
import QualityModel from "@/models/Quality.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, STAFF_ROLES, ADMIN_ONLY } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

const ownerOf = (showroomId) =>
  showroomId === "warehouse" ? { $in: ["warehouse", null, ""] } : showroomId;

export async function GET(req) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const filter = { deletedAt: null };

    if (searchParams.get("active") === "true") filter.isActive = true;

    // One showroom's own list (no owner means the warehouse's)
    const showroomId = searchParams.get("showroomId") || "";
    if (showroomId && showroomId !== "all") filter.showroomId = ownerOf(showroomId);

    const qualities = await QualityModel.find(filter).sort({ sortOrder: 1, name: 1 });

    return NextResponse.json({ success: true, data: qualities });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ success: false, message: "Quality name is required" }, { status: 400 });
    }

    const showroomId = String(body.showroomId || "warehouse");

    // a trashed quality still owns its name
    const existing = await QualityModel.findOne({ showroomId: ownerOf(showroomId), name: exactRegex(name) });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: existing.deletedAt ? "This quality is in the trash. Restore it instead." : "Quality already exists",
        },
        { status: 409 },
      );
    }

    const quality = await QualityModel.create({
      name,
      showroomId,
      isActive: body.isActive !== false,
      sortOrder: Number(body.sortOrder) || 0,
    });

    return NextResponse.json({ success: true, data: quality }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Quality already exists" }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

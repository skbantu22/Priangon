import mongoose from "mongoose";
import { NextResponse } from "next/server";

import AreaModel from "@/models/Area.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex, exactRegex } from "@/lib/escapeRegex";

/** The branch a request works in; blank or "warehouse" is the warehouse */
const branchOf = (value) => {
  if (!value || value === "warehouse" || value === "all") return null;

  return mongoose.isValidObjectId(value) ? value : undefined;
};

/** Area list, for the Area List screen and the supplier / customer pickers */
export async function GET(req) {
  try {
    const auth = await requirePermission("areas.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const search = (searchParams.get("search") || "").trim();
    const scope = searchParams.get("branch") || "all";

    const filter = { deletedAt: null };

    // "all" reads every branch; anything else is one branch's list
    if (scope !== "all") {
      const branch = branchOf(scope);

      if (branch === undefined) {
        return NextResponse.json(
          { success: false, message: "Unknown branch" },
          { status: 400 },
        );
      }

      filter.showroomId = branch;
    }

    if (search) filter.name = { $regex: escapeRegex(search), $options: "i" };

    const data = await AreaModel.find(filter).sort({ name: 1 }).lean();

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("AREA LIST ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load areas" },
      { status: 500 },
    );
  }
}

/** Adds an area to the branch being worked in */
export async function POST(req) {
  try {
    const auth = await requirePermission("areas.manage");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Area name is required" },
        { status: 400 },
      );
    }

    const branch = branchOf(body.showroomId);

    if (branch === undefined) {
      return NextResponse.json(
        { success: false, message: "Unknown branch" },
        { status: 400 },
      );
    }

    const existing = await AreaModel.findOne({
      name: exactRegex(name),
      showroomId: branch,
      deletedAt: null,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "This branch already has that area" },
        { status: 409 },
      );
    }

    const area = await AreaModel.create({
      name,
      showroomId: branch,
      note: String(body.note || "").trim(),
      isActive: body.isActive !== false,
    });

    return NextResponse.json({ success: true, data: area }, { status: 201 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "This branch already has that area" },
        { status: 409 },
      );
    }

    console.error("AREA CREATE ERROR:", error);

    return NextResponse.json(
      { success: false, message: error.message || "Could not save the area" },
      { status: 500 },
    );
  }
}

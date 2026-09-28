import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import Showroom from "@/models/Showroom.model";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function PATCH(req, context) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();

    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Branch not found" }, { status: 404 });
    }

    const body = await req.json();
    const showroom = await Showroom.findById(id);
    if (!showroom) {
      return NextResponse.json({ success: false, message: "Branch not found" }, { status: 404 });
    }

    if (body.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json({ success: false, message: "Branch name required" }, { status: 400 });
      }
      const taken = await Showroom.findOne({ name, _id: { $ne: id } }).select("_id").lean();
      if (taken) {
        return NextResponse.json({ success: false, message: "A branch with this name already exists" }, { status: 400 });
      }
      showroom.name = name;
    }

    if (body.address !== undefined) showroom.address = String(body.address || "").trim();
    if (body.phone !== undefined) showroom.phone = String(body.phone || "").trim();
    if (body.email !== undefined) showroom.email = String(body.email || "").trim();
    if (body.website !== undefined) showroom.website = String(body.website || "").trim();
    if (body.logo !== undefined) showroom.logo = String(body.logo || "").trim();

    if (typeof body.isActive === "boolean") showroom.isActive = body.isActive;

    await showroom.save();
    return NextResponse.json({ success: true, showroom });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import Banner from "@/models/Banner.model"; 
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

// UPDATE BANNER
export async function PUT(req, { params }) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();
    const { id } =  await params;
    const body = await req.json();

    const updatedBanner = await Banner.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true }
    );

    if (!updatedBanner) {
      return NextResponse.json({ message: "Banner not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updatedBanner, success: true });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// DELETE BANNER
export async function DELETE(req, { params }) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();
    const { id } =await params;

    const deletedBanner = await Banner.findByIdAndDelete(id);

    if (!deletedBanner) {
      return NextResponse.json({ message: "Banner not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Banner deleted", success: true });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
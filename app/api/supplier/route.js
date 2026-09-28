import { NextResponse } from "next/server";
import SupplierModel from "@/models/Supplier.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission } from "@/lib/apiAuth";
import { ensureSystemRoles } from "@/models/Role.model";

export async function GET(req) {
  try {
    await connectDB();
    await ensureSystemRoles();

    const auth = await requireAnyPermission(["suppliers.view", "purchase.create"]);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    if (searchParams.get("active") === "true") {
      filter.isActive = true;
    }

    const search = searchParams.get("search")?.trim();

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const suppliers = await SupplierModel.find(filter).sort({ name: 1 });

    return NextResponse.json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

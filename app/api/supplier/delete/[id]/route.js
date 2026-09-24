import { NextResponse } from "next/server";
import SupplierModel from "@/models/Supplier.model";
import PurchaseModel from "@/models/Purchase.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function DELETE(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const supplier = await SupplierModel.findOne({ _id: id, deletedAt: null });

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 },
      );
    }

    // A supplier with purchase history has to stay, otherwise those
    // purchases lose the name behind the due they carry
    const purchaseCount = await PurchaseModel.countDocuments({
      supplierId: id,
      deletedAt: null,
    });

    if (purchaseCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `This supplier has ${purchaseCount} purchase(s). Mark them inactive instead of deleting.`,
        },
        { status: 409 },
      );
    }

    supplier.deletedAt = new Date();
    await supplier.save();

    return NextResponse.json({
      success: true,
      message: "Supplier moved to trash",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

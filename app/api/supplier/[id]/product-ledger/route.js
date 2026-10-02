import mongoose from "mongoose";
import { NextResponse } from "next/server";

import SupplierModel from "@/models/Supplier.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { supplierLedger } from "@/lib/supplierService";

/**
 * The supplier's statement with the goods written against each line.
 *
 * Same ledger as /ledger, with a details column naming what was on each
 * purchase and each return — "what did that money buy", read down the
 * same rows the accountant already knows.
 */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("suppliers.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    const supplier = mongoose.isValidObjectId(id)
      ? await SupplierModel.findOne({ _id: id, deletedAt: null }).lean()
      : null;

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 },
      );
    }

    const { searchParams } = new URL(req.url);

    const ledger = await supplierLedger(supplier, {
      start: searchParams.get("start_date") || "",
      end: searchParams.get("end_date") || "",
      withProducts: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        supplier: {
          _id: String(supplier._id),
          name: supplier.name,
          companyName: supplier.companyName,
          phone: supplier.phone,
          address: supplier.address,
          area: supplier.area,
        },
        ...ledger,
      },
    });
  } catch (error) {
    console.error("SUPPLIER PRODUCT LEDGER ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not load the ledger" },
      { status: 500 },
    );
  }
}

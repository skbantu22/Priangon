import { NextResponse } from "next/server";
import mongoose from "mongoose";

import PurchaseModel from "@/models/Purchase.model";
import SupplierModel from "@/models/Supplier.model";
import ProductVariant from "@/models/ProductVariant.model ";
import { connectDB } from "@/lib/databaseconnection";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";
import { applyPurchaseToStock } from "@/lib/purchaseService";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    if (!mongoose.isValidObjectId(body.supplierId)) {
      return NextResponse.json(
        { success: false, message: "Select a supplier" },
        { status: 400 },
      );
    }

    const supplier = await SupplierModel.findOne({
      _id: body.supplierId,
      deletedAt: null,
    });

    if (!supplier) {
      return NextResponse.json(
        { success: false, message: "Supplier not found" },
        { status: 404 },
      );
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "Add at least one item" },
        { status: 400 },
      );
    }

    // Rebuild every row from the database so prices and totals cannot
    // be tampered with from the browser
    const items = [];

    for (const raw of rawItems) {
      if (!mongoose.isValidObjectId(raw.variantId)) {
        return NextResponse.json(
          { success: false, message: "An item has an invalid variant" },
          { status: 400 },
        );
      }

      const variant = await ProductVariant.findOne({
        _id: raw.variantId,
        deletedAt: null,
      }).populate("product", "name unit");

      if (!variant) {
        return NextResponse.json(
          { success: false, message: "An item's variant no longer exists" },
          { status: 404 },
        );
      }

      const quantity = Number(raw.quantity);
      const unitPrice = Number(raw.unitPrice);

      if (!Number.isFinite(quantity) || quantity < 1) {
        return NextResponse.json(
          {
            success: false,
            message: `Quantity for "${variant.product?.name || "item"}" must be at least 1`,
          },
          { status: 400 },
        );
      }

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Purchase price for "${variant.product?.name || "item"}" is invalid`,
          },
          { status: 400 },
        );
      }

      const imeis = Array.isArray(raw.imeis)
        ? raw.imeis.map((imei) => String(imei).trim()).filter(Boolean)
        : [];

      if (imeis.length > quantity) {
        return NextResponse.json(
          {
            success: false,
            message: `"${variant.product?.name || "item"}" has ${imeis.length} IMEI(s) for only ${quantity} unit(s)`,
          },
          { status: 400 },
        );
      }

      items.push({
        productId: variant.product?._id || variant.product,
        variantId: variant._id,
        productName: variant.product?.name || "",
        variantLabel: [variant.color, variant.size].filter(Boolean).join(" / "),
        sku: variant.sku || "",
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        imeis,
      });
    }

    const seq = await getNextInvoiceNumber("purchase");

    const purchase = new PurchaseModel({
      purchaseNumber: `PUR-${seq}`,
      supplierId: supplier._id,
      supplierName: supplier.name,
      referenceNo: body.referenceNo?.trim() || "",
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
      items,
      discount: Math.max(0, Number(body.discount) || 0),
      shippingCost: Math.max(0, Number(body.shippingCost) || 0),
      note: body.note?.trim() || "",
      createdBy: body.createdBy?.trim() || "",
      status: body.status === "received" ? "received" : "pending",
    });

    const paidNow = Math.max(0, Number(body.paidAmount) || 0);

    if (paidNow > 0) {
      purchase.payments.push({
        amount: paidNow,
        method: body.paymentMethod || "cash",
        reference: body.paymentReference?.trim() || "",
        note: "Paid while creating the purchase",
        createdBy: purchase.createdBy,
      });
    }

    purchase.recalculateTotals();

    if (purchase.paidAmount > purchase.grandTotal) {
      return NextResponse.json(
        {
          success: false,
          message: `Paid amount cannot be more than the total (${purchase.grandTotal})`,
        },
        { status: 400 },
      );
    }

    if (purchase.status === "received") {
      purchase.receivedAt = new Date();
    }

    await purchase.save();

    // Stock moves only after the purchase itself is safely stored
    if (purchase.status === "received") {
      await applyPurchaseToStock(purchase, { createdBy: purchase.createdBy });
    }

    return NextResponse.json(
      { success: true, data: purchase },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

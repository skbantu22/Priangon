import { NextResponse } from "next/server";
import mongoose from "mongoose";

import PurchaseModel from "@/models/Purchase.model";
import PurchaseOrder from "@/models/PurchaseOrder.model";
import SupplierModel from "@/models/Supplier.model";
import ProductVariant from "@/models/ProductVariant.model ";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import {
  applyNewRates,
  applyPurchaseToStock,
  cleanRates,
  nextPurchaseNumber,
} from "@/lib/purchaseService";

const METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

const dateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function POST(req) {
  try {
    const auth = await requirePermission("purchase.create");
    if (auth.response) return auth.response;

    await connectDB();

    const body = await req.json();

    if (!mongoose.isValidObjectId(body.supplierId)) return fail("Select a supplier");

    const supplier = await SupplierModel.findOne({ _id: body.supplierId, deletedAt: null });

    if (!supplier) return fail("Supplier not found", 404);

    // Receiving a purchase order: it has to still be open, and it is the
    // order — not the browser — that says which new sale rates to apply
    let order = null;

    if (body.purchaseOrderId) {
      order = mongoose.isValidObjectId(body.purchaseOrderId)
        ? await PurchaseOrder.findOne({ _id: body.purchaseOrderId, deletedAt: null })
        : null;

      if (!order) return fail("Purchase order not found", 404);
      if (order.status !== "pending") return fail(`${order.orderNumber} is already ${order.status}`, 409);
      if (String(order.supplierId) !== String(supplier._id)) {
        return fail(`${order.orderNumber} was written to another supplier`);
      }
    }

    const ratesByVariant = new Map(
      (order?.items || []).map((item) => [String(item.variantId), cleanRates(item)]),
    );

    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (rawItems.length === 0) return fail("Add at least one item");

    // Rebuild every row from the database so names and totals cannot be
    // tampered with from the browser
    const items = [];

    for (const raw of rawItems) {
      if (!mongoose.isValidObjectId(raw.variantId)) return fail("An item has an invalid variant");

      const variant = await ProductVariant.findOne({ _id: raw.variantId, deletedAt: null }).populate(
        "product",
        "name unit",
      );

      if (!variant) return fail("An item's variant no longer exists", 404);

      const name = variant.product?.name || "item";
      const quantity = Number(raw.quantity);
      const extraQty = Number(raw.extraQty) || 0;
      const unitPrice = Number(raw.unitPrice);
      const discount = round2(raw.discount);

      if (!Number.isFinite(quantity) || quantity < 1) return fail(`Quantity for "${name}" must be at least 1`);
      if (!Number.isFinite(extraQty) || extraQty < 0) return fail(`Extra quantity for "${name}" is invalid`);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return fail(`Purchase price for "${name}" is invalid`);
      if (discount < 0) return fail(`Discount for "${name}" is invalid`);

      const gross = round2(quantity * unitPrice);

      if (discount > gross) return fail(`Discount for "${name}" is more than its subtotal`);

      const imeis = Array.isArray(raw.imeis)
        ? [...new Set(raw.imeis.map((imei) => String(imei).trim()).filter(Boolean))]
        : [];

      if (imeis.length > quantity + extraQty) {
        return fail(`"${name}" has ${imeis.length} IMEI(s) for only ${quantity + extraQty} unit(s)`);
      }

      items.push({
        productId: variant.product?._id || variant.product,
        variantId: variant._id,
        productName: variant.product?.name || "",
        variantLabel: [variant.color, variant.size]
          .filter((x) => x && !/^(default|standard)$/i.test(x))
          .join(" / "),
        sku: variant.sku || "",
        quantity,
        extraQty,
        unitPrice,
        discount,
        total: round2(gross - discount),
        expireDate: dateOrNull(raw.expireDate),
        imeis,
        newRates: ratesByVariant.get(String(variant._id)) || cleanRates(),
      });
    }

    // The invoice number is ours to give; one typed by hand must be free
    const typedNumber = String(body.purchaseNumber || "").trim().slice(0, 40);

    if (typedNumber && (await PurchaseModel.exists({ purchaseNumber: typedNumber }))) {
      return fail(`Invoice no ${typedNumber} is already used`, 409);
    }

    const subtotal = round2(items.reduce((sum, item) => sum + item.total, 0));
    const discountType = body.discountType === "percent" ? "percent" : "amount";
    const discountValue = Math.max(0, round2(body.discountValue ?? body.discount));

    if (discountType === "percent" && discountValue > 100) return fail("Discount cannot be more than 100%");

    const discount = Math.min(
      subtotal,
      discountType === "percent" ? round2((subtotal * discountValue) / 100) : discountValue,
    );

    const createdBy = await actorFullName(auth);

    const purchase = new PurchaseModel({
      purchaseNumber: typedNumber || (await nextPurchaseNumber()),
      supplierId: supplier._id,
      supplierName: supplier.name,
      referenceNo: String(body.referenceNo || "").trim(),
      purchaseDate: dateOrNull(body.purchaseDate) || new Date(),
      dueDate: dateOrNull(body.dueDate),
      purchaseOrderId: order?._id || null,
      attachment: {
        url: String(body.attachment?.url || "").trim(),
        publicId: String(body.attachment?.publicId || "").trim(),
      },
      items,
      discount,
      discountType,
      discountValue,
      shippingCost: Math.max(0, round2(body.shippingCost)),
      note: String(body.note || "").trim(),
      createdBy,
      status: body.status === "pending" ? "pending" : "received",
    });

    // Several payments may be made at once (part cash, part bKash). An
    // older form sends a single paidAmount instead.
    const rawPayments = Array.isArray(body.payments)
      ? body.payments
      : [{ amount: body.paidAmount, method: body.paymentMethod, reference: body.paymentReference }];

    for (const raw of rawPayments) {
      const amount = round2(raw?.amount);

      if (amount < 0) return fail("A payment amount is invalid");
      if (!amount) continue;

      purchase.payments.push({
        amount,
        method: METHODS.includes(raw.method) ? raw.method : "cash",
        reference: String(raw.reference || "").trim(),
        note: "Paid while creating the purchase",
        paidAt: purchase.purchaseDate,
        createdBy,
      });
    }

    purchase.recalculateTotals();

    if (purchase.paidAmount - purchase.grandTotal > 0.009) {
      return fail(`Paid amount cannot be more than the total (${purchase.grandTotal})`);
    }

    if (purchase.status === "received") purchase.receivedAt = new Date();

    await purchase.save();

    // Stock moves only after the purchase itself is safely stored. If that
    // fails part way the purchase must not stay marked received, or the
    // rows that did go in can never be received again — same rollback the
    // receive route does.
    if (purchase.status === "received") {
      try {
        await applyPurchaseToStock(purchase, { createdBy });
      } catch (stockError) {
        purchase.status = "pending";
        purchase.receivedAt = null;
        await purchase.save();

        throw stockError;
      }

      await applyNewRates(purchase.items);
    }

    if (order) {
      order.status = "received";
      order.purchaseId = purchase._id;
      order.purchaseNumber = purchase.purchaseNumber;
      await order.save();
    }

    return NextResponse.json(
      { success: true, message: "Purchase saved", data: purchase },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

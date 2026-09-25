import mongoose from "mongoose";
import { NextResponse } from "next/server";

import ProductModel from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import Showroom from "@/models/Showroom.model";
import InventoryTransaction from "@/models/InventoryTransaction.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";

const OUTGOING = new Set(["OUT", "SALE", "TRANSFER_OUT", "DAMAGE"]);

/**
 * One product's stock at every place (warehouse and each showroom) and its
 * latest stock movements, for the Details tab of the product list.
 */
export async function GET(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    const product = mongoose.isValidObjectId(id)
      ? await ProductModel.findById(id).select("variants").lean()
      : null;

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const variantIds = product.variants || [];

    const [variants, warehouse, showroomStock, showrooms, movements] = await Promise.all([
      ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null }).select("barcode sku color size").lean(),
      WarehouseStock.find({ variantId: { $in: variantIds } }).select("variantId stock").lean(),
      ShowroomStock.find({ variantId: { $in: variantIds } }).select("variantId showroomId stock").lean(),
      Showroom.find({}).select("name").lean(),
      InventoryTransaction.find({ productId: product._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("variantId showroomId type quantity previousStock newStock note createdAt")
        .lean(),
    ]);

    const showroomName = new Map(showrooms.map((s) => [String(s._id), s.name]));
    const placeOf = (showroomId) => (showroomId ? showroomName.get(String(showroomId)) || "Showroom" : "Warehouse");
    const variantLabel = new Map(
      variants.map((v) => [
        String(v._id),
        v.barcode || v.sku || [v.color, v.size].filter(Boolean).join(" · "),
      ]),
    );

    const rows = variants.map((v) => {
      const key = String(v._id);
      const places = [
        ...warehouse.filter((s) => String(s.variantId) === key).map((s) => ({ place: "Warehouse", qty: Number(s.stock) || 0 })),
        ...showroomStock
          .filter((s) => String(s.variantId) === key)
          .map((s) => ({ place: placeOf(s.showroomId), qty: Number(s.stock) || 0 })),
      ];

      return {
        _id: v._id,
        barcode: variantLabel.get(key),
        label: [v.color, v.size].filter((x) => x && !/^(default|standard)$/i.test(x)).join(" · "),
        places,
        total: places.reduce((sum, p) => sum + p.qty, 0),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        variants: rows,
        movements: movements.map((m) => ({
          _id: m._id,
          date: m.createdAt,
          type: m.type,
          barcode: variantLabel.get(String(m.variantId)) || "",
          place: placeOf(m.showroomId),
          // quantity is stored unsigned; the before/after figures give the direction
          qty:
            Number.isFinite(m.previousStock) && Number.isFinite(m.newStock)
              ? m.newStock - m.previousStock
              : (OUTGOING.has(m.type) ? -1 : 1) * (Number(m.quantity) || 0),
          balance: m.newStock,
          note: m.note || "",
        })),
      },
    });
  } catch (error) {
    console.error("PRODUCT STOCK ERROR:", error);

    return NextResponse.json({ success: false, message: "Could not load stock" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";
import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import CouponModel from "@/models/Coupon.model";
import MediaModel from "@/models/Media.model";
import mongoose from "mongoose";

const shippingMap = { dhaka: 70, other: 120 };

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json().catch(() => ({}));
    const { customer, items, coupon, userId } = body;

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { success: false, message: "Missing customer info" },
        { status: 400 },
      );
    }

    // --- 1. Map IDs & Fetch Data ---
    const lookupIds = items
      .map((i) => i.variantId || i.productId)
      .filter(Boolean);

    // 🛠️ POPULATE BOTH: We need secure_url from the Media model for both variants and products
    const [dbVariants, dbProducts] = await Promise.all([
      ProductVariantModel.find({ _id: { $in: lookupIds } })
        .populate("product")
        .populate("media", "secure_url")
        .lean(),
      ProductModel.find({ _id: { $in: lookupIds } })
        .populate("media", "secure_url")
        .lean(),
    ]);

    const variantMap = new Map(dbVariants.map((v) => [String(v._id), v]));
    const productMap = new Map(dbProducts.map((p) => [String(p._id), p]));

    const clean = items
      .map((it) => {
        const id = String(it.variantId || it.productId);
        const v = variantMap.get(id);
        const p = productMap.get(id);
        const target = v || p;

        if (!target) return null;

        // 🛠️ EXTRACTOR: Handles cases where media is populated or just a string
        const getMediaUrl = (obj) => {
          if (!obj?.media || obj.media.length === 0) return "";
          const first = obj.media[0];
          // If populated, it's an object: { secure_url: "..." }
          // If not populated, it's a string: "https://..."
          return first?.secure_url || (typeof first === "string" ? first : "");
        };

        const itemMedia = v ? getMediaUrl(v) : getMediaUrl(p);

        return {
          productId: v ? v.product?._id : target._id,
          variantId: v ? v._id : null,
          name: v ? v.product?.name : target.name,
          slug: v ? v.product?.slug : target.slug,
          color: v?.color || "",
          size: v?.size || it.size || "",
          mrp: Number(v?.mrp || target.mrp || 0),
          sellingPrice: Number(v?.sellingPrice || target.sellingPrice || 0),
          discount: Number(
            v?.discountPercentage || target.discountPercentage || 0,
          ),
          media: itemMedia, // 🚀 Now this will be the https URL
          quantity: Math.max(1, Number(it.quantity || 1)),
        };
      })
      .filter(Boolean);

    // --- 2. Totals & Coupon ---
    const subtotal = clean.reduce((s, i) => s + i.sellingPrice * i.quantity, 0);
    const city = String(customer.cityId || "other").toLowerCase();
    const shippingFee = shippingMap[city] ?? 120;

    let discount = 0;
    let couponData = { code: "", discountPercentage: 0 };
    if (coupon?.code) {
      const doc = await CouponModel.findOne({
        code: { $regex: new RegExp(`^${coupon.code.trim()}$`, "i") },
        deletedAt: null,
      }).lean();

      if (doc && subtotal >= (doc.minShoppingAmount || 0)) {
        discount = Math.round((subtotal * (doc.discountPercentage || 0)) / 100);
        couponData = {
          code: doc.code,
          discountPercentage: doc.discountPercentage,
        };
      }
    }

    const total = Math.max(subtotal + shippingFee - discount, 0);

    const tempId = new mongoose.Types.ObjectId();
    const manualOrderNumber = `ORD-${tempId.toString().toUpperCase().slice(-6)}`;

    // --- 4. Save Order ---
    const orderDocs = await OrderModel.create(
      [
        {
          orderNumber: manualOrderNumber,
          userId: userId || null,
          customer: { ...customer, cityId: city },
          items: clean,
          subtotal,
          shippingFee,
          discount,
          total,
          coupon: couponData,
          status: "pending",
          paymentMethodSelected: "cod",
          payments: [
            {
              method: "cod",
              status: "unpaid",
              amount: total,
              merchantInvoiceNumber: manualOrderNumber,
              initiatedAt: new Date(),
            },
          ],
        },
      ],
      { validateBeforeSave: false },
    );

    const order = orderDocs[0];

    // --- 5. Stock Update ---
    await Promise.all(
      clean.map((i) => {
        const Model = i.variantId ? ProductVariantModel : ProductModel;
        return Model.updateOne(
          { _id: i.variantId || i.productId, stock: { $gte: i.quantity } },
          { $inc: { stock: -i.quantity } },
        );
      }),
    );

    return NextResponse.json({
      success: true,
      orderId: order._id.toString(),
      orderNumber: manualOrderNumber,
    });
  } catch (err) {
    console.error("CRITICAL CHECKOUT ERROR:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  }
}

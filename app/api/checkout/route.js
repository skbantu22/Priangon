// app/api/order/create/route.js

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/databaseconnection";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";

import OrderModel from "@/models/Order.model";
import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import CouponModel from "@/models/Coupon.model";

const shippingMap = {
  dhaka: 80,
  other: 150,
};

export async function POST(req) {
  const session = await mongoose.startSession();

  try {
    await connectDB();
    session.startTransaction();

    const body = await req.json();
    const { customer, items, coupon, userId, note } = body;

    // ================= VALIDATION =================
    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { success: false, message: "Missing customer info" },
        { status: 400 },
      );
    }

    if (!items?.length) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 },
      );
    }

    const phone = customer.phone.replace(/\D/g, "");
    if (!/^01\d{9}$/.test(phone)) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number" },
        { status: 400 },
      );
    }

    // ================= ORDER NUMBER =================
    const orderNumber = await getNextInvoiceNumber("order");

    // ================= FETCH PRODUCTS =================
    const lookupIds = items.map((i) => i.variantId || i.productId);

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

    // ================= CLEAN ITEMS =================
    const clean = items
      .map((it) => {
        const id = String(it.variantId || it.productId);

        const v = variantMap.get(id);
        const p = productMap.get(id);

        const target = v || p;
        if (!target) return null;

        const media =
          v?.media?.[0]?.secure_url || p?.media?.[0]?.secure_url || "";

        return {
          productId: v ? v.product?._id : target._id,
          variantId: v ? v._id : null,
          name: v ? v.product?.name : target.name,
          color: v?.color || "",
          size: v?.size || "",
          sellingPrice: Number(v?.sellingPrice || target.sellingPrice || 0),
          quantity: Math.max(1, Number(it.quantity || 1)),
          media,
        };
      })
      .filter(Boolean);

    if (!clean.length) {
      return NextResponse.json(
        { success: false, message: "Invalid products" },
        { status: 400 },
      );
    }

    // ================= CALCULATION =================
    const subtotal = clean.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0,
    );

    const city = String(customer.cityId || "other").toLowerCase();
    const shippingFee = shippingMap[city] ?? shippingMap.other;

    let discount = 0;
    let couponData = { code: "", discountPercentage: 0 };

    if (coupon?.code) {
      const doc = await CouponModel.findOne({
        code: new RegExp(`^${coupon.code.trim()}$`, "i"),
      }).lean();

      if (doc && subtotal >= (doc.minShoppingAmount || 0)) {
        discount = Math.round((subtotal * doc.discountPercentage) / 100);

        couponData = {
          code: doc.code,
          discountPercentage: doc.discountPercentage,
        };
      }
    }

    const total = subtotal + shippingFee - discount;

    // ================= CREATE ORDER =================
    const order = await OrderModel.create(
      [
        {
          orderNumber,
          note: note?.slice(0, 500) || "",
          userId: userId || null,
          customer: {
            ...customer,
            phone,
            cityId: city,
          },
          items: clean,
          subtotal,
          shippingFee,
          discount,
          total,
          coupon: couponData,
          status: "pending",
          paymentMethodSelected: "cod",
        },
      ],
      { session },
    );

    const createdOrder = order[0];

    // ================= STOCK UPDATE =================
    for (const item of clean) {
      const Model = item.variantId ? ProductVariantModel : ProductModel;

      const result = await Model.updateOne(
        {
          _id: item.variantId || item.productId,
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        },
        { session },
      );

      if (!result.modifiedCount) {
        throw new Error(`${item.name} out of stock`);
      }
    }

    await session.commitTransaction();

    return NextResponse.json({
      success: true,
      orderId: createdOrder._id,
      orderNumber,
      message: "Order placed successfully",
    });
  } catch (err) {
    await session.abortTransaction().catch(() => {});
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 },
    );
  } finally {
    session.endSession();
  }
}

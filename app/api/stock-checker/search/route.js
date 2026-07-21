import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";

import WarehouseStock from "@/models/WarehouseStock.model";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";

import "@/models/Product.model";
import "@/models/ProductVariant.model ";
import "@/models/Media.model";
import "@/models/category.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();

    // যদি সার্চ ইনপুট খালি থাকে, তবে দ্রুত ফাঁকা অ্যারে রিটার্ন করুন
    if (!search) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const regex = new RegExp(search, "i");

    // ১. প্রথমে প্রোডাক্ট কালেকশন থেকে নাম দিয়ে আইডিগুলো খুঁজে বের করুন
    const matchingProducts = await Product.find({ name: regex }, "_id").lean();
    const productIdsFromNames = matchingProducts.map((p) => p._id);

    // ২. ভ্যারিয়েন্ট কালেকশন থেকে বারকোড বা এসকেইউ দিয়ে ভ্যারিয়েন্টগুলো খুঁজুন
    const matchingVariants = await ProductVariant.find(
      {
        $or: [{ barcode: regex }, { sku: regex }],
      },
      "_id productId",
    ).lean();

    const variantIds = matchingVariants.map((v) => v._id);
    const productIdsFromVariants = matchingVariants.map((v) => v.productId);

    // সব ম্যাচিং প্রোডাক্ট আইডি একত্র করুন
    const allProductIds = [
      ...new Set([...productIdsFromNames, ...productIdsFromVariants]),
    ];

    if (allProductIds.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    // ৩. শুধুমাত্র ম্যাচিং প্রোডাক্টগুলোর WarehouseStock কুয়েরি করুন
    let warehouseStocks = await WarehouseStock.find({
      $or: [
        { productId: { $in: allProductIds } },
        { variantId: { $in: variantIds } },
      ],
    })
      .populate({
        path: "productId",
        populate: [
          { path: "category", select: "name" },
          { path: "media", select: "secure_url" },
        ],
      })
      .populate({
        path: "variantId",
        populate: {
          path: "media",
          select: "secure_url url",
        },
      })
      .lean();

    warehouseStocks = warehouseStocks.filter(
      (item) => item.productId && item.variantId,
    );

    // ৪. ইউনিক প্রোডাক্ট ফিল্টার করুন
    const uniqueProducts = [];
    const ids = new Set();

    warehouseStocks.forEach((item) => {
      const id = item.productId._id.toString();

      if (!ids.has(id)) {
        ids.add(id);

        uniqueProducts.push({
          _id: item.productId._id,
          name: item.productId.name,
          slug: item.productId.slug,
          category: item.productId.category?.name || "",
          image: item.productId.media?.[0]?.secure_url || null,
        });
      }
    });

    return NextResponse.json({
      success: true,
      count: uniqueProducts.length,
      data: uniqueProducts,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      {
        status: 500,
      },
    );
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";

import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import Showroom from "@/models/Showroom.model";

import "@/models/Product.model";
import "@/models/ProductVariant.model ";
import "@/models/Media.model";
import "@/models/category.model";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { productId } = await params;

    let warehouseStocks = await WarehouseStock.find({
      productId,
    })
      .populate({
        path: "productId",
        populate: [
          {
            path: "category",
            select: "name",
          },
          {
            path: "media",
            select: "secure_url",
          },
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

    const showrooms = await Showroom.find({}, "name").lean();

    const showroomStocks = await ShowroomStock.find({
      productId,
    })
      .populate("showroomId", "name")
      .lean();

    const showroomMap = {};

    showroomStocks.forEach((stock) => {
      const key = `${stock.productId}_${stock.variantId}`;

      if (!showroomMap[key]) {
        showroomMap[key] = [];
      }

      showroomMap[key].push({
        showroomId: stock.showroomId?._id,
        showroomName: stock.showroomId?.name,
        stock: Number(stock.stock) || 0,
      });
    });

    if (!warehouseStocks.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found",
        },
        {
          status: 404,
        },
      );
    }

    const product = warehouseStocks[0].productId;

    const response = {
      _id: product._id,
      name: product.name,
      slug: product.slug,
      category: product.category?.name || "",
      image: product.media?.[0]?.secure_url || null,
      totalStock: 0,
      variants: [],
    };

    warehouseStocks.forEach((item) => {
      const variantKey = `${item.productId._id}_${item.variantId._id}`;

      const showroomList = showrooms.map((showroom) => {
        const found = (showroomMap[variantKey] || []).find(
          (s) => String(s.showroomId) === String(showroom._id),
        );

        return {
          showroomId: showroom._id,
          showroomName: showroom.name,
          stock: found ? found.stock : 0,
        };
      });

      const warehouseStock = Number(item.stock) || 0;

      const showroomTotal = showroomList.reduce(
        (sum, item) => sum + item.stock,
        0,
      );

      const totalStock = warehouseStock + showroomTotal;

      response.totalStock += totalStock;

      response.variants.push({
        _id: item.variantId._id,
        color: item.variantId.color,
        size: item.variantId.size,
        barcode: item.variantId.barcode,
        sku: item.variantId.sku,
        image:
          item.variantId.media?.[0]?.secure_url ||
          product.media?.[0]?.secure_url ||
          null,
        warehouseStock,
        reservedStock: Number(item.reservedStock) || 0,
        totalStock,
        showroomStocks: showroomList,
      });
    });

    return NextResponse.json({
      success: true,
      data: response,
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

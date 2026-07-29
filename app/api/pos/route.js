import { connectDB } from "@/lib/databaseconnection";
import Product from "@/models/Product.model";
import ShowroomStock from "@/models/ShowroomStock";
import ProductVariant from "@/models/ProductVariant.model ";

import "@/models/Media.model";

export async function GET(req) {
  const start = performance.now();

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = 20;
    const skip = (page - 1) * limit;

    const showroomId = searchParams.get("showroomId");
    const categoryId = searchParams.get("categoryId");
    const q = (searchParams.get("q") || "").trim();

    const query = {
      deletedAt: null,
    };

    if (categoryId && categoryId !== "all") {
      query.category = categoryId;
    }

    if (q) {
      const matchedVariants = await ProductVariant.find({
        $or: [
          {
            barcode: {
              $regex: q,
              $options: "i",
            },
          },
          {
            sku: {
              $regex: q,
              $options: "i",
            },
          },
        ],
      })
        .select("product")
        .lean();

      const variantProductIds = matchedVariants
        .map((v) => v.product?.toString())
        .filter(Boolean);

      query.$or = [
        {
          name: {
            $regex: q,
            $options: "i",
          },
        },
        {
          _id: {
            $in: variantProductIds,
          },
        },
      ];
    }
    // Showroom wise product filter
    if (showroomId && showroomId !== "all") {
      const showroomProducts = await ShowroomStock.find({
        showroomId,
      })
        .select("productId")
        .lean();

      const productIds = [
        ...new Set(
          showroomProducts
            .map((item) => item.productId?.toString())
            .filter(Boolean),
        ),
      ];

      if (!productIds.length) {
        return Response.json({
          success: true,
          items: [],
          page,
          limit,
          hasMore: false,
        });
      }

      query._id = {
        $in: productIds,
      };
    }

    console.log("showroomId:", showroomId);

    const products = await Product.find(query)
      .select("name sellingPrice media variants")
      .skip(skip)
      .limit(limit)
      .populate({
        path: "media",
        select: "secure_url",
      })
      .populate({
        path: "variants",
        select: "color size sku barcode mrp sellingPrice media",
      })
      .lean();

    if (!products.length) {
      return Response.json({
        success: true,
        items: [],
        page,
        limit,
        hasMore: false,
      });
    }

    const variantIds = [];

    for (const product of products) {
      for (const variant of product.variants || []) {
        variantIds.push(variant._id);
      }
    }

    const stockQuery = {
      variantId: { $in: variantIds },
    };

    // showroom filter
    if (showroomId && showroomId !== "all") {
      stockQuery.showroomId = showroomId;
    }

    const stocks = await ShowroomStock.find(stockQuery)
      .select("variantId stock")
      .lean();

    const stockMap = new Map();

    for (const stock of stocks) {
      const key = stock.variantId.toString();

      stockMap.set(key, (stockMap.get(key) || 0) + Number(stock.stock || 0));
    }

    const items = products.map((product) => ({
      productId: {
        _id: product._id,
        name: product.name,
        sellingPrice: product.sellingPrice,
        image: product.media?.[0]?.secure_url || "/placeholder.png",
      },

      variants: (product.variants || []).map((variant) => ({
        _id: variant._id,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        barcode: variant.barcode,
        mrp: variant.mrp,
        sellingPrice: variant.sellingPrice,

        // showroom wise stock (or all showroom total)
        showroomStock: stockMap.get(variant._id.toString()) ?? 0,

        image:
          variant.media?.[0]?.secure_url ||
          product.media?.[0]?.secure_url ||
          "/placeholder.png",
      })),
    }));

    console.log(
      "TOTAL Execution:",
      (performance.now() - start).toFixed(2),
      "ms",
    );

    return Response.json({
      success: true,
      items,
      page,
      limit,
      hasMore: products.length === limit,
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
      },
      {
        status: 500,
      },
    );
  }
}

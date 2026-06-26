import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";
import ProductModel from "@/models/Product.model";
import WarehouseStock from "@/models/WarehouseStock.model";

// SKU generator
const generateSKU = (productId) => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SKU-${productId.toString().slice(-4)}-${rand}`;
};

// barcode generator
const generateBarcode = () => {
  return String(Math.floor(10000000 + Math.random() * 90000000));
};

export async function POST(request) {
  console.log("🔥 VARIANT CREATE API HIT");

  try {
    await connectDB();

    const payload = await request.json();

    const productId = payload.productId; // ✅ ONLY SOURCE OF TRUTH

    const variants = Array.isArray(payload.variants) ? payload.variants : [];

    if (!productId) {
      return response(false, 400, "productId missing");
    }

    const product =
      await ProductModel.findById(productId).select("mrp sellingPrice");

    if (!product) {
      return response(false, 404, "Product not found");
    }

    const createdVariants = [];
    const productVariantIds = [];

    for (const item of variants) {
      const existingVariant = await ProductVariantModel.findOne({
        product: productId,
        color: item.color || "",
        size: item.size || "",
      });

      if (existingVariant) continue;

      const stock = Math.max(0, Number(item.openingStock || 0));

      const barcode = item.barcode?.trim()
        ? item.barcode.trim()
        : generateBarcode();

      const variant = await ProductVariantModel.create({
        product: productId,

        color: item.color || "",
        size: item.size || "",

        sku: generateSKU(productId),
        barcode,

        mrp: product.mrp,
        sellingPrice: Number(item.sellingPrice) || product.sellingPrice,

        purchasePrice: Number(item.purchasePrice) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        afterDiscount: Number(item.afterDiscount) || 0,

        priceSource: "PRODUCT",

        stock,
        sold: 0,

        media: item.media || [],
        videos: item.videos || [],

        isActive: item.isActive ?? true,
      });

      // warehouse stock
      await WarehouseStock.create({
        productId,
        variantId: variant._id,
        stock,
        reservedStock: 0,
      });

      createdVariants.push(variant);
      productVariantIds.push(variant._id);
    }

    // ✅ FIXED PRODUCT UPDATE
    if (productVariantIds.length) {
      await ProductModel.findByIdAndUpdate(productId, {
        $addToSet: {
          variants: { $each: productVariantIds },
        },
      });
    }

    return response(true, 201, "Variants created", {
      count: createdVariants.length,
      variants: createdVariants,
    });
  } catch (error) {
    console.error("Create Variant Error:", error);
    return catchError(error);
  }
}

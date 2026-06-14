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

// Barcode generator (12 digit)
const generateBarcode = () => {
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
};

export async function POST(request) {
  try {
    await connectDB();
    const payload = await request.json();

    // 1. Product check
    const product = await ProductModel.findById(payload.product).select(
      "mrp sellingPrice",
    );

    if (!product) {
      return response(false, 404, "Product not found");
    }

    // 2. Duplicate variant check
    const existingVariant = await ProductVariantModel.findOne({
      product: payload.product,
      color: payload.color,
      size: payload.size,
    });

    if (existingVariant) {
      return response(
        false,
        400,
        "এই কালার এবং সাইজের ভ্যারিয়েন্ট ইতিমধ্যে যোগ করা হয়েছে।",
      );
    }

    // 3. Stock sanitize
    const initialStock = Math.max(0, Number(payload.stock) || 0);

    // 4. Auto generate identifiers
    const sku = generateSKU(payload.product);
    const barcode = generateBarcode();

    // 5. CREATE VARIANT (PRICE FROM PRODUCT + PRICE SOURCE SYSTEM)
    const newProductVariant = await ProductVariantModel.create({
      product: payload.product,
      color: payload.color || "",
      size: payload.size || "",

      sku,
      barcode,

      // ✅ inherit product price
      mrp: product.mrp,
      sellingPrice: product.sellingPrice,

      // ✅ IMPORTANT: price source system
      priceSource: "PRODUCT",

      stock: initialStock,
      sold: 0,

      media: payload.media || [],
      isActive: payload.isActive ?? true,
    });

    // 6. Warehouse stock entry
    await WarehouseStock.create({
      productId: payload.product,
      variantId: newProductVariant._id,
      stock: initialStock,
      reservedStock: 0,
    });

    // 7. Link variant to product
    await ProductModel.findByIdAndUpdate(payload.product, {
      $addToSet: { variants: newProductVariant._id },
    });

    return response(true, 201, "ভ্যারিয়েন্ট সফলভাবে তৈরি হয়েছে।", {
      variantId: newProductVariant._id,
      sku,
      barcode,
      priceSource: "PRODUCT",
    });
  } catch (error) {
    console.error("Error creating product variant:", error);
    return catchError(error, "ভ্যারিয়েন্ট অ্যাড করতে সমস্যা হয়েছে।");
  }
}

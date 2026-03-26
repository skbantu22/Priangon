import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import MediaModel from "@/models/Media.model";
import CategoryModel from "@/models/category.model";
import SubCategoryModel from "@/models/subcategory.model";

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const size = searchParams.get("size");
    const color = searchParams.get("color");

    if (!slug) return response(false, 404, "Slug is required");

    // 1️⃣ Fetch main product
    const getProduct = await ProductModel.findOne({ slug, deletedAt: null })
      .populate("media", "secure_url")
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .populate("sizeChart", "secure_url")

      .lean();

    if (!getProduct) return response(false, 404, "Product not found");

    // 2️⃣ Fetch all variants for the product
    const rawVariants = await ProductVariantModel.find({
      product: getProduct._id,
    })
      .populate("media", "secure_url")
      .lean();

    // 3️⃣ Sort variants by size
    const sizeOrder = [
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
      "XXXL",
      "2XL",
      "3XL",
      "4XL",
    ];
    const sortSizes = (a, b) => {
      const isNumA = !isNaN(Number(a));
      const isNumB = !isNaN(Number(b));

      if (isNumA && isNumB) return Number(a) - Number(b);
      if (isNumA && !isNumB) return -1;
      if (!isNumA && isNumB) return 1;

      const indexA = sizeOrder.indexOf(a.toUpperCase());
      const indexB = sizeOrder.indexOf(b.toUpperCase());

      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    };

    const allVariants = rawVariants.sort((a, b) => sortSizes(a.size, b.size));
    const sortedSizes = [...new Set(allVariants.map((v) => v.size))].filter(
      Boolean,
    );
    const getColor = [...new Set(allVariants.map((v) => v.color))];

    const activeVariant =
      allVariants.find(
        (v) =>
          (color ? v.color === color : true) && (size ? v.size === size : true),
      ) || allVariants[0];

    // 4️⃣ Fetch similar products (same category, excluding current product)
    const similarProducts = await ProductModel.find({
      category: getProduct.category._id,
      _id: { $ne: getProduct._id },
      deletedAt: null,
    })
      .limit(8) // max 8 similar products
      .sort({ createdAt: -1 })
      .populate("media", "secure_url")
      .populate("subcategory", "name slug")
      .lean();

    // 5️⃣ Fetch variants for similar products
    const similarProductIds = similarProducts.map((p) => p._id);
    const similarVariants = await ProductVariantModel.find({
      product: { $in: similarProductIds },
      deletedAt: null,
    })
      .populate("media", "secure_url")
      .lean();

    const similarProductsWithVariants = similarProducts.map((p) => {
      const variants = similarVariants.filter(
        (v) => v.product.toString() === p._id.toString(),
      );
      const colors = [...new Set(variants.map((v) => v.color))];
      const sizes = [...new Set(variants.map((v) => v.size))];

      return {
        ...p,
        allVariants: variants,
        colors,
        sizes,
      };
    });

    const productData = {
      product: getProduct,
      variant: activeVariant,
      allVariants: allVariants,
      colors: getColor,
      sizes: sortedSizes,
      similarProducts: similarProductsWithVariants, // ✅ added similar products
    };

    return response(true, 200, "Product data found.", productData);
  } catch (error) {
    console.error("API ERROR:", error); // 👈 ADD THIS

    return catchError(error);
  }
}

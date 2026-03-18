import ProductModel from "@/models/Product.model";
import MediaModel from "@/models/Media.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const size = searchParams.get("size");
    const color = searchParams.get("color");

    if (!slug) return response(false, 404, 'Slug is required');

    // ১. প্রোডাক্ট ডেটা ফেচ
    const getProduct = await ProductModel.findOne({ slug, deletedAt: null })
      .populate('media', 'secure_url') 
      .populate('category', 'name slug')        // add this
       .populate('subcategory', 'name slug') 
      .lean();

    if (!getProduct) return response(false, 404, 'Product not found');

    // ২. সব ভেরিয়েন্ট ফেচ করা
    const rawVariants = await ProductVariantModel.find({ product: getProduct._id })
      .populate('media', 'secure_url')
      .lean();

    // ৩. সর্টিং গাইড (Priority Map)
    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL"];

    // সর্টিং ফাংশন (Reusable)
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

    // ৪. সব ভেরিয়েন্টগুলোকে আগে থেকে সর্ট করে রাখা
    // এটি করলে ফ্রন্টএন্ডে আর কোনো সর্টিং করার প্রয়োজন পড়বে না
    const allVariants = rawVariants.sort((a, b) => sortSizes(a.size, b.size));

    // ৫. ইউনিক এবং সর্টেড সাইজ লিস্ট তৈরি
    const sortedSizes = [...new Set(allVariants.map(v => v.size))].filter(Boolean);

    // ৬. ইউনিক কালার লিস্ট
    const getColor = [...new Set(allVariants.map(v => v.color))];

    // ৭. Active Variant নির্ধারণ (URL প্যারামিটার অনুযায়ী অথবা প্রথমটি)
    const activeVariant = allVariants.find(v => 
      (color ? v.color === color : true) && (size ? v.size === size : true)
    ) || allVariants[0];

    const productData = {
      product: getProduct,
      variant: activeVariant,
      allVariants: allVariants, // অলরেডি সর্টেড
      colors: getColor,
      sizes: sortedSizes, // অলরেডি সর্টেড
    };

    return response(true, 200, 'Product data found.', productData);

  } catch (error) {
    return catchError(error);
  }
}
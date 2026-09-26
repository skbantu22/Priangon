import { connectDB } from "@/lib/databaseconnection";
import VatGroupModel from "@/models/VatGroup.model";
import Product from "@/models/Product.model";
import ShowroomStock from "@/models/ShowroomStock";
import ProductVariant from "@/models/ProductVariant.model ";
import Media from "@/models/Media.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function GET(req) {
  const auth = await requireRoles(STAFF_ROLES);
  if (auth.response) return auth.response;

  const start = performance.now();

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = 20;
    const skip = (page - 1) * limit;

    const showroomId = searchParams.get("showroomId");
    const categoryId = searchParams.get("categoryId");
    const brand = (searchParams.get("brand") || "").trim();
    const sort = searchParams.get("sort") || "latest";
    const q = (searchParams.get("q") || "").trim();

    const hasShowroom = !!showroomId && showroomId !== "all";

    // Independent look-ups go out together, so one round-trip to the DB
    const [matchedVariants, showroomProductIds] = await Promise.all([
      q
        ? ProductVariant.find({
            $or: [
              { barcode: { $regex: escapeRegex(q), $options: "i" } },
              { sku: { $regex: escapeRegex(q), $options: "i" } },
            ],
          })
            .select("product")
            .lean()
        : null,
      hasShowroom ? ShowroomStock.distinct("productId", { showroomId }) : null,
    ]);

    if (hasShowroom && !showroomProductIds.length) {
      return Response.json({
        success: true,
        items: [],
        page,
        limit,
        hasMore: false,
      });
    }

    const query = {
      deletedAt: null,
    };

    if (categoryId && categoryId !== "all") {
      query.category = categoryId;
    }

    if (brand) {
      query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    }

    if (q) {
      query.$or = [
        { name: { $regex: escapeRegex(q), $options: "i" } },
        {
          _id: {
            $in: matchedVariants.map((v) => v.product).filter(Boolean),
          },
        },
      ];
    }

    if (hasShowroom) {
      query._id = { $in: showroomProductIds };
    }

    // No populate: variant and media ids are already on the product,
    // so they are fetched below in parallel with the stock
    const sortBy =
      {
        latest: { _id: -1 },
        oldest: { _id: 1 },
        "price-asc": { sellingPrice: 1, _id: 1 },
        "price-desc": { sellingPrice: -1, _id: 1 },
        name: { name: 1, _id: 1 },
      }[sort] || { _id: -1 };

    const products = await Product.find(query)
      .select("name brand category sellingPrice dealerPrice subDealerPrice wholesalerPrice media variants warranty trackSerial vatGroup")
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
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
    const mediaIds = [];

    for (const product of products) {
      variantIds.push(...(product.variants || []));
      mediaIds.push(...(product.media || []));
    }

    const stockQuery = {
      variantId: { $in: variantIds },
    };

    // showroom filter
    if (hasShowroom) {
      stockQuery.showroomId = showroomId;
    }

    const [variants, mediaDocs, stocks] = await Promise.all([
      ProductVariant.find({ _id: { $in: variantIds } })
        .select("color size sku barcode mrp sellingPrice media")
        .lean(),
      Media.find({ _id: { $in: mediaIds } })
        .select("secure_url")
        .lean(),
      ShowroomStock.find(stockQuery).select("variantId stock").lean(),
    ]);

    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));
    const mediaMap = new Map(mediaDocs.map((m) => [m._id.toString(), m]));

    const stockMap = new Map();

    for (const stock of stocks) {
      const key = stock.variantId.toString();

      stockMap.set(key, (stockMap.get(key) || 0) + Number(stock.stock || 0));
    }

    // VAT / SD groups (Settings → VAT Settings) by id
    const vatGroupIds = [...new Set(products.map((p) => p.vatGroup).filter(Boolean).map(String))];
    const vatPercent = new Map(
      vatGroupIds.length
        ? (await VatGroupModel.find({ _id: { $in: vatGroupIds }, deletedAt: null, isActive: { $ne: false } }).select("percent").lean()).map(
            (g) => [String(g._id), Number(g.percent) || 0],
          )
        : [],
    );

    const items = products.map((product) => {
      // first media that still exists, same as populate used to give
      const productImage =
        (product.media || [])
          .map((id) => mediaMap.get(id.toString())?.secure_url)
          .find(Boolean) || "/placeholder.png";

      return {
        productId: {
          _id: product._id,
          name: product.name,
          brand: product.brand || "",
          category: product.category || null,
          warranty: product.warranty || { type: "none", months: 0 },
          trackSerial: !!product.trackSerial,
          sellingPrice: product.sellingPrice,
          vatPercent: vatPercent.get(String(product.vatGroup)) || 0,
          // price list per customer type (purchase price stays on the server)
          tierPrices: {
            dealerPrice: product.dealerPrice || 0,
            subDealerPrice: product.subDealerPrice || 0,
            wholesalerPrice: product.wholesalerPrice || 0,
          },
          image: productImage,
        },

        variants: (product.variants || [])
          .map((id) => variantMap.get(id.toString()))
          .filter(Boolean)
          .map((variant) => ({
            _id: variant._id,
            color: variant.color,
            size: variant.size,
            sku: variant.sku,
            barcode: variant.barcode,
            mrp: variant.mrp,
            sellingPrice: variant.sellingPrice,

            // showroom wise stock (or all showroom total)
            showroomStock: stockMap.get(variant._id.toString()) ?? 0,

            // variant media holds either a Media doc or a plain image URL
            image:
              (typeof variant.media?.[0] === "string"
                ? variant.media[0]
                : variant.media?.[0]?.secure_url) || productImage,
          })),
      };
    });

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

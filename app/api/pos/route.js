import { connectDB } from "@/lib/databaseconnection";
import VatGroupModel from "@/models/VatGroup.model";
import Product from "@/models/Product.model";
import ShowroomStock from "@/models/ShowroomStock";
import ProductVariant from "@/models/ProductVariant.model ";
import Media from "@/models/Media.model";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";
import { resolveLockedTill } from "@/lib/posTillAuth";

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

    const till = await resolveLockedTill(auth, searchParams.get("showroomId"));
    const showroomId = till.showroomId;
    const categoryId = searchParams.get("categoryId");
    const brand = (searchParams.get("brand") || "").trim();
    const sort = searchParams.get("sort") || "latest";
    const q = (searchParams.get("q") || "").trim();

    const isWarehouse = till.isWarehouse;
    const hasShowroom =
      !isWarehouse && /^[a-f\d]{24}$/i.test(String(showroomId || ""));

    // Only this shop. Missing rows and zero stock stay off the grid.
    if (!hasShowroom) {
      return Response.json({
        success: true,
        items: [],
        page,
        limit,
        total: 0,
        hasMore: false,
      });
    }

    // This shop only. No warehouse, no variant.stock, no other branch.
    const stockRows = await ShowroomStock.find({
      showroomId,
      stock: { $gt: 0 },
    })
      .select("productId variantId stock")
      .lean();

    const stockedProductIds = [
      ...new Set(stockRows.map((row) => row.productId).filter(Boolean)),
    ];
    const shopStock = new Map(
      stockRows.map((row) => [String(row.variantId), Number(row.stock) || 0]),
    );

    if (!stockedProductIds.length) {
      return Response.json({
        success: true,
        items: [],
        page,
        limit,
        total: 0,
        hasMore: false,
      });
    }

    const matchedVariants = q
      ? await ProductVariant.find({
          $or: [
            { barcode: { $regex: escapeRegex(q), $options: "i" } },
            { sku: { $regex: escapeRegex(q), $options: "i" } },
          ],
        })
          .select("product")
          .lean()
      : null;

    const query = {
      deletedAt: null,
      _id: { $in: stockedProductIds },
    };

    if (categoryId && categoryId !== "all") {
      query.category = categoryId;
    }

    if (brand) {
      query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    }

    if (q) {
      const allowed = new Set(stockedProductIds.map((id) => String(id)));
      const fromVariant = (matchedVariants || [])
        .map((row) => row.product)
        .filter((id) => id && allowed.has(String(id)));
      // Search stays inside this shop's in-stock ids. It cannot add the catalog.
      query.$and = [
        { _id: { $in: stockedProductIds } },
        {
          $or: [
            { name: { $regex: escapeRegex(q), $options: "i" } },
            { _id: { $in: fromVariant } },
          ],
        },
      ];
      delete query._id;
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
      .select("name brand category subcategory sellingPrice dealerPrice subDealerPrice wholesalerPrice media variants warranty trackSerial vatGroup")
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

    const [variants, mediaDocs] = await Promise.all([
      ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null })
        .select("color size sku barcode mrp sellingPrice dealerPrice subDealerPrice wholesalerPrice media")
        .lean(),
      Media.find({ _id: { $in: mediaIds } })
        .select("secure_url")
        .lean(),
    ]);

    const variantMap = new Map(variants.map((v) => [v._id.toString(), v]));
    const mediaMap = new Map(mediaDocs.map((m) => [m._id.toString(), m]));

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
          subcategory: product.subcategory || null,
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
            dealerPrice: variant.dealerPrice,
            subDealerPrice: variant.subDealerPrice,
            wholesalerPrice: variant.wholesalerPrice,

            showroomStock: shopStock.get(variant._id.toString()) || 0,

            // variant media holds either a Media doc or a plain image URL
            image:
              (typeof variant.media?.[0] === "string"
                ? variant.media[0]
                : variant.media?.[0]?.secure_url) || productImage,
          }))
          .filter((variant) => Number(variant.showroomStock) > 0),
      };
    }).filter((item) => item.variants.length > 0);

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

import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";
import ProductModel from "@/models/Product.model";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { applyStockChange } from "@/lib/stockService";
import { locationForTill, purchaseLocationForAuth } from "@/lib/purchaseService";
import { onHandAt } from "@/lib/posShelf";

// SKU generator
const generateSKU = (productId) => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SKU-${productId.toString().slice(-4)}-${rand}`;
};

// barcode generator
const generateBarcode = () => {
  return String(Math.floor(10000000 + Math.random() * 90000000));
};

// Opening stock stays on the branch that is open. A showroom is never
// rewritten to the warehouse. A non-admin cannot pick another branch.
async function openingLocation(auth, requested) {
  const location =
    auth?.role === "admin"
      ? await locationForTill(requested)
      : await purchaseLocationForAuth(auth);
  if (!location) throw new Error("Select the branch this stock belongs to");
  return location;
}

export async function POST(request) {
  const auth = await requirePermission("products.create");
  if (auth.response) return auth.response;

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
      await ProductModel.findById(productId).select("mrp sellingPrice productType");

    if (!product) {
      return response(false, 404, "Product not found");
    }

    const createdVariants = [];
    let location;
    let createdBy;
    for (const item of variants) {
      const existingVariant = await ProductVariantModel.findOne({
        product: productId,
        color: item.color || "",
        size: item.size || "",
      });

      if (existingVariant) {
        // A prior attempt may have created the variant but failed before
        // linking it to the product. Link it so a retry can recover cleanly.
        await ProductModel.findByIdAndUpdate(productId, {
          $addToSet: { variants: existingVariant._id },
        });
        // The first attempt can save the variant and then fail before the
        // shelf row is written. A retry used to skip that quantity, so the
        // POS kept saying out of stock. Place it only when nothing is on hand,
        // so a second Save does not double the stock.
        const stock = Math.max(0, Number(item.stock || 0));
        location ??= await openingLocation(auth, payload.location || payload.showroomId);
        if (stock > 0 && (await onHandAt({
          locationType: location.locationType,
          locationId: location.locationId,
          productId,
          variantId: existingVariant._id,
        })) <= 0) {
          createdBy ??= await actorFullName(auth);
          await applyStockChange({
            locationType: location.locationType,
            locationId: location.locationId,
            productId,
            variantId: existingVariant._id,
            delta: stock,
            type: "OPENING",
            note: "Opening stock",
            createdBy,
            productName: `${item.color || ""} ${item.size || ""}`.trim() || "item",
          });
        }
        continue;
      }
      const stock = Math.max(0, Number(item.stock || 0));

      const barcode = item.barcode?.trim()
        ? item.barcode.trim()
        : generateBarcode();

      const variant = await ProductVariantModel.create({
        product: productId,

        color: item.color || "",
        size: item.size || "",

        sku: generateSKU(productId),
        barcode,

        mrp: Number(item.mrp) || product.mrp,
        sellingPrice: Number(item.sellingPrice) || product.sellingPrice,
        dealerPrice: Number(item.dealerPrice) || 0,
        subDealerPrice: Number(item.subDealerPrice) || 0,
        wholesalerPrice: Number(item.wholesalerPrice) || 0,

        purchasePrice: Number(item.purchasePrice) || 0,
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        afterDiscount: Number(item.afterDiscount) || 0,

        priceSource: "PRODUCT",

        stock: 0,
        sold: 0,

        media: item.media || [],
        videos: item.videos || [],

        isActive: item.isActive ?? true,
      });

      // Opening qty goes only onto the selected branch. A showroom does not
      // get a warehouse row, so other branches cannot sell it.
      if (stock > 0) {
        location ??= await openingLocation(auth, payload.location || payload.showroomId);
        createdBy ??= await actorFullName(auth);
        await applyStockChange({
          locationType: location.locationType,
          locationId: location.locationId,
          productId,
          variantId: variant._id,
          delta: stock,
          type: "OPENING",
          note: "Opening stock",
          createdBy,
          productName: `${item.color || ""} ${item.size || ""}`.trim() || "item",
        });
      }

      createdVariants.push(variant);
      await ProductModel.findByIdAndUpdate(productId, {
        $addToSet: {
          variants: variant._id,
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

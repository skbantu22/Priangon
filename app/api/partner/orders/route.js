import { NextResponse } from "next/server";
import { getPartner, partnerUnauthorized } from "@/lib/partner.server";
import { partnerPrice } from "@/lib/priceTiers";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import ShowroomStock from "@/models/ShowroomStock";
import Showroom from "@/models/Showroom.model";
import Media from "@/models/Media.model";
import POSOrder from "@/models/posorder.model";
import PartnerOrder from "@/models/PartnerOrder.model";

const MAX_LINES = 100;

// GET /api/partner/orders: my orders + my invoices
export async function GET() {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  const customerId = partner.customer._id;
  const [orders, invoices] = await Promise.all([
    PartnerOrder.find({ customerId }).sort({ createdAt: -1 }).limit(200).lean(),
    POSOrder.find({ customerId, status: "completed" })
      .select("orderNumber saleDate createdAt total paidAmount dueAmount items")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
  ]);

  return NextResponse.json({ success: true, orders, invoices });
}

// POST { items: [{ variantId, qty }], note }
// Prices are always recomputed here from the partner's price list.
export async function POST(req) {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  try {
    const { items = [], note = "" } = await req.json();

    const wanted = new Map();
    for (const line of items) {
      const qty = Math.floor(Number(line?.qty) || 0);
      if (!line?.variantId || qty <= 0) continue;
      wanted.set(String(line.variantId), (wanted.get(String(line.variantId)) || 0) + qty);
    }
    if (!wanted.size) throw new Error("Your order is empty");
    if (wanted.size > MAX_LINES) throw new Error(`At most ${MAX_LINES} different items per order`);

    const variantIds = [...wanted.keys()];
    const variants = await ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null })
      .select("product color size sellingPrice media")
      .lean();
    if (variants.length !== variantIds.length) {
      throw new Error("Some items are no longer available. Please refresh the product list.");
    }

    const [products, stocks, showroom] = await Promise.all([
      Product.find({ _id: { $in: variants.map((v) => v.product) }, deletedAt: null })
        .select("name sellingPrice dealerPrice subDealerPrice wholesalerPrice media")
        .lean(),
      ShowroomStock.aggregate([
        { $match: { variantId: { $in: variants.map((v) => v._id) } } },
        { $group: { _id: "$variantId", stock: { $sum: "$stock" } } },
      ]),
      Showroom.findOne({ isActive: { $ne: false } }).sort({ createdAt: 1 }).select("_id").lean(),
    ]);
    const productMap = new Map(products.map((p) => [String(p._id), p]));
    const stockMap = new Map(stocks.map((s) => [String(s._id), s.stock]));
    const medias = await Media.find({ _id: { $in: products.map((p) => p.media?.[0]).filter(Boolean) } })
      .select("secure_url")
      .lean();
    const mediaMap = new Map(medias.map((m) => [String(m._id), m.secure_url]));

    const lines = variants.map((v) => {
      const product = productMap.get(String(v.product));
      if (!product) throw new Error("Some items are no longer available.");
      const qty = wanted.get(String(v._id));
      const stock = stockMap.get(String(v._id)) || 0;
      if (qty > stock) {
        throw new Error(
          `${product.name} (${[v.size, v.color].filter(Boolean).join(" / ")}): only ${Math.max(0, stock)} in stock`,
        );
      }
      const price = partnerPrice(product, v, partner.type);
      return {
        productId: product._id,
        variantId: v._id,
        productName: product.name,
        image:
          (typeof v.media?.[0] === "string" && v.media[0]) ||
          mediaMap.get(String(product.media?.[0])) ||
          "",
        color: v.color,
        size: v.size,
        qty,
        price,
        subtotal: price * qty,
      };
    });

    const seq = await getNextInvoiceNumber("partner_order");
    const order = await PartnerOrder.create({
      // DO- (dealer order), so it never reads like a purchase order (PO-)
      orderNumber: `DO-${String(seq).padStart(5, "0")}`,
      userId: partner.user._id,
      customerId: partner.customer._id,
      customerType: partner.type,
      customerName: partner.customer.name,
      phone: partner.customer.phone || "",
      showroomId: showroom?._id,
      items: lines,
      total: lines.reduce((s, l) => s + l.subtotal, 0),
      note: String(note).trim().slice(0, 500),
    });

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}

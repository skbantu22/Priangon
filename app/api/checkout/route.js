import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import CouponModel from "@/models/Coupon.model";

const shippingMap = {
  dhaka: 70,
  other: 120,
};

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));

    const customer = body?.customer || {};
    const items = Array.isArray(body?.items) ? body.items : [];
    const coupon = body?.coupon || null;

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { success: false, message: "Customer information missing" },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        { success: false, message: "Cart items missing" },
        { status: 400 }
      );
    }

    // --------------------------------
    // Fetch product variants
    // --------------------------------
    const variantIds = items.map((i) => i?.variantId).filter(Boolean);

    const dbVariants = await ProductVariantModel.find({
      _id: { $in: variantIds },
    })
      .populate("product", "name slug")
      .populate("media", "secure_url")
      .lean();

    const variantMap = new Map(dbVariants.map((v) => [String(v._id), v]));
    const clean = [];

    for (const it of items) {
      const v = variantMap.get(String(it?.variantId || ""));
      if (!v || !v.product) continue;

      const qty = Math.max(1, Number(it?.quantity || 1));

      if (typeof v.stock === "number" && v.stock < qty) {
        return NextResponse.json(
          {
            success: false,
            message: `${v.product.name} (${v.color}/${v.size}) is out of stock`,
          },
          { status: 400 }
        );
      }

      clean.push({
        productId: v.product._id,
        variantId: v._id,
        name: v.product.name,
        slug: v.product.slug,
        color: v.color || "",
        size: v.size || "",
        mrp: Number(v.mrp || 0),
        sellingPrice: Number(v.sellingPrice || 0),
        discount: Number(v.discountPercentage || 0),
        media: v.media?.[0]?.secure_url || "",
        quantity: qty,
      });
    }

    if (!clean.length) {
      return NextResponse.json(
        { success: false, message: "No valid items found" },
        { status: 400 }
      );
    }

    // --------------------------------
    // Subtotal
    // --------------------------------
    const subtotal = clean.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );

    const city = String(customer?.cityId || "other").toLowerCase();
    const shippingFee = shippingMap[city] ?? 120;

    // --------------------------------
    // Coupon validation
    // --------------------------------
    let discount = 0;
    let appliedCouponData = { code: "", discountPercentage: 0 };

    if (coupon?.code) {
      const inputCode = String(coupon.code).trim();

      const couponDoc = await CouponModel.findOne({
        code: { $regex: new RegExp(`^${inputCode}$`, "i") },
        deletedAt: null,
      }).lean();

      if (!couponDoc) {
        return NextResponse.json(
          { success: false, message: "Invalid coupon code" },
          { status: 400 }
        );
      }

      if (couponDoc.validity && new Date() > new Date(couponDoc.validity)) {
        return NextResponse.json(
          { success: false, message: "Coupon has expired" },
          { status: 400 }
        );
      }

      if (subtotal < Number(couponDoc.minShoppingAmount || 0)) {
        return NextResponse.json(
          {
            success: false,
            message: `Minimum shopping amount is ৳${couponDoc.minShoppingAmount}`,
          },
          { status: 400 }
        );
      }

      discount = Math.round(
        (subtotal * Number(couponDoc.discountPercentage || 0)) / 100
      );

      appliedCouponData = {
        code: couponDoc.code,
        discountPercentage: couponDoc.discountPercentage,
      };
    }

    // --------------------------------
    // Final total
    // --------------------------------
    const total = Math.max(subtotal + shippingFee - discount, 0);

    const paymentAttempt = {
      method: "cod",
      status: "unpaid",
      merchantInvoiceNumber: "",
      paymentId: "",
      trxId: "",
      valId: "",
      amount: total,
      currency: "BDT",
      rawResponse: {},
      initiatedAt: new Date(),
    };

    // --------------------------------
    // Create order
    // --------------------------------
    const order = await OrderModel.create({
      userId: body?.userId || null,
      customer: { ...customer, cityId: city },
      items: clean,
      subtotal,
      shippingFee,
      discount,
      total,
      coupon: appliedCouponData,
      currency: "BDT",
      status: "pending",
      paymentMethodSelected: "cod",
      payments: [paymentAttempt],
      activePaymentIndex: 0,
    });

    // --------------------------------
    // Reduce stock (safe update)
    // --------------------------------
    await ProductVariantModel.bulkWrite(
      clean.map((item) => ({
        updateOne: {
          filter: {
            _id: item.variantId,
            stock: { $gte: item.quantity },
          },
          update: { $inc: { stock: -item.quantity } },
        },
      }))
    );

    // --------------------------------
    // Generate invoice
    // --------------------------------
    const invoice = order.orderNumber || `ORD-${order._id.toString()}`;

    await OrderModel.findByIdAndUpdate(order._id, {
      $set: { "payments.0.merchantInvoiceNumber": invoice },
    });

    return NextResponse.json({
      success: true,
      method: "cod",
      orderId: order._id,
      orderNumber: invoice,
      status: "Placed",
      paymentStatus: "UNPAID",
      subtotal,
      shippingFee,
      discount,
      total,
      coupon: appliedCouponData,
      message: "Order placed successfully",
    });
  } catch (err) {
    console.error("POST /api/checkout error:", err);

    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
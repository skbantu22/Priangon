import mongoose from "mongoose";
import ShowroomStock from "@/models/ShowroomStock";
import Posorder from "@/models/posorder.model";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";
import { connectDB } from "@/lib/databaseconnection";
import { NextResponse } from "next/server";
import Customer from "@/models/Customer.model";
import { normalizeCustomerType } from "@/lib/priceTiers";
import Product from "@/models/Product.model";
import { warrantyExpiryDate } from "@/lib/warranty";
/* =========================
   GET ORDER
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, message: "Missing orderNumber" },
        { status: 400 },
      );
    }

    let order;

    if (orderNumber.startsWith("INV-")) {
      order = await Posorder.findOne({ orderNumber });
    } else {
      order = await Posorder.findById(orderNumber);
    }

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}

/* =========================
   POST ORDER (FINAL FIXED)
========================= */
export async function POST(req) {
  await connectDB();

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const body = await req.json();

    const {
      items,
      total,
      subTotal,
      discount,
      vat,
      payments,
      deliveryCharge,
      remark,
      showroomId,
      createdBy,
      soldBy,
      customerName,
      phone,
      address,
      saleDate,
      isExchangeMode,
    } = body;
    const customerType = normalizeCustomerType(body.customerType);

    /* =========================
       VALIDATION
    ========================= */
    if (!items?.length) throw new Error("Cart is empty");
    if (!showroomId) throw new Error("Showroom required");

    /* =========================
       🛡️ WARRANTY + IMEI
       (warranty terms come from the product, never from the client)
    ========================= */
    const productDocs = await Product.find({
      _id: { $in: items.map((i) => i.productId) },
    })
      .select("warranty trackSerial purchasePrice")
      .lean();
    const productMap = new Map(productDocs.map((p) => [String(p._id), p]));
    const sellDate = saleDate ? new Date(saleDate) : new Date();

    const allImeis = [];
    for (const item of items) {
      const product = productMap.get(String(item.productId));
      const imeis = (item.imeis || [])
        .map((s) => String(s).trim())
        .filter(Boolean);

      if (product?.trackSerial && imeis.length !== Number(item.qty)) {
        throw new Error(
          `${item.productName}: enter ${item.qty} IMEI / serial number(s)`,
        );
      }

      const months = Number(product?.warranty?.months) || 0;
      item.imeis = imeis;
      item.warrantyType = months ? product.warranty.type : "none";
      item.warrantyMonths = months;
      item.warrantyExpiry = warrantyExpiryDate(sellDate, months);
      // cost at the time of sale, for profit reports
      item.purchasePrice = Number(product?.purchasePrice) || 0;
      allImeis.push(...imeis);
    }

    if (new Set(allImeis).size !== allImeis.length) {
      throw new Error("The same IMEI / serial is entered twice");
    }
    if (allImeis.length) {
      const sold = await Posorder.findOne({
        "items.imeis": { $in: allImeis },
        status: "completed",
      })
        .select("orderNumber items.imeis")
        .lean();
      if (sold) {
        const dup = sold.items
          .flatMap((i) => i.imeis || [])
          .find((s) => allImeis.includes(s));
        throw new Error(`IMEI ${dup} was already sold (${sold.orderNumber})`);
      }
    }

    const paidAmount = (payments || []).length
      ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      : Number(total || 0);
    // rounded to paisa so VAT fractions don't leave a phantom due
    const dueAmount = Math.max(
      0,
      Math.round(
        (Number(total || 0) + Number(deliveryCharge || 0) - paidAmount) * 100,
      ) / 100,
    );

    // a due (বাকি) sale must be traceable to a customer; checked before an
    // invoice number is taken so a rejected sale leaves no gap in the numbers
    if (dueAmount > 0 && !phone?.trim()) {
      throw new Error("Customer phone is required for a due sale");
    }

    const seq = await getNextInvoiceNumber("pos_invoice");
    const orderNumber = `INV-${String(seq).padStart(6, "0")}`;

    /* =========================
       CUSTOMER CREATE / UPDATE
    ========================= */

    let customer = null;

    if (phone?.trim()) {
      customer = await Customer.findOne({ phone }).session(session);

      if (customer) {
        customer.name = customerName || customer.name;
        customer.address = address || customer.address;
        customer.type = customerType;
        customer.totalOrders += 1;
        customer.totalSpent += Number(total || 0);

        await customer.save({ session });
      } else {
        customer = await Customer.create(
          [
            {
              name: customerName || "Walk In Customer",
              phone,
              address,
              type: customerType,
              totalOrders: 1,
              totalSpent: Number(total || 0),
            },
          ],
          { session },
        );

        customer = customer[0];
      }
    }

    /* =========================
       CLEAN PAYMENTS
    ========================= */

    const cleanPayments =
      payments?.length > 0
        ? payments.map((p) => ({
            type: p.type,
            option: p.option || "",
            amount: Number(p.amount),
          }))
        : [
            {
              type: "Cash",
              option: "",
              amount: Number(total),
            },
          ];

    /* =========================
       STOCK UPDATE
    ========================= */

    for (const item of items) {
      const stockDoc = await ShowroomStock.findOne({
        showroomId,
        productId: item.productId,
        variantId: item.variantId,
      }).session(session);

      if (!stockDoc) {
        throw new Error(`Stock not found for product ${item.productId}`);
      }

      const update =
        stockDoc.stock !== undefined
          ? { stock: -item.qty }
          : { showroomStock: -item.qty };

      await ShowroomStock.updateOne(
        {
          showroomId,
          productId: item.productId,
          variantId: item.variantId,
        },
        {
          $inc: update,
        },
        {
          session,
        },
      );
    }

    /* =========================
       ORDER DATA
    ========================= */

    const orderData = {
      orderNumber,

      customerId: customer?._id || null,

      items,

      total,
      subTotal: subTotal || total,
      discount: discount || 0,
      vat: vat || 0,

      payments: cleanPayments,

      paidAmount,
      dueAmount,

      deliveryCharge: deliveryCharge || 0,

      remark,

      soldBy: soldBy || "Counter Guest",

      customerName,
      customerType,
      phone,
      address,

      saleDate,

      showroomId,

      userId: createdBy || null,

      exchange: {
        isExchange: isExchangeMode || false,
        reason: "",
        returnedItems: [],
        newItems: [],
        refundAmount: 0,
        extraPaid: 0,
        exchangeDate: new Date(),
        processedBy: createdBy || null,
      },

      status: "completed",

      orderType: isExchangeMode ? "exchange" : "pos",

      createdAt: new Date(),
    };

    const order = await Posorder.create([orderData], {
      session,
    });

    await session.commitTransaction();

    session.endSession();

    return NextResponse.json({
      success: true,
      message: isExchangeMode
        ? "Exchange completed successfully"
        : "Order created successfully",
      order: order[0],
      customer,
    });
  } catch (error) {
    console.error(error);

    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    session.endSession();

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 400,
      },
    );
  }
}

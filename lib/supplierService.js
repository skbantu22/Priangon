import mongoose from "mongoose";

import SupplierModel from "@/models/Supplier.model";
import PurchaseModel from "@/models/Purchase.model";
import SupplierPayment from "@/models/SupplierPayment.model";
import PurchaseReturn from "@/models/PurchaseReturn.model";
import { nextDocumentNumber } from "@/lib/stockService";

/**
 * What the shop and a supplier owe each other.
 *
 * Total is the opening due plus every purchase that was not cancelled.
 * Paid is the money handed over on the purchase screen plus every supplier
 * payment. A payment spread over purchases is also written onto those
 * purchases, so those rows are skipped here to avoid counting it twice.
 *
 *   due = total − paid − dismiss − advance − returned + received back
 *
 * Goods sent back (a purchase return) come off the due; cash the supplier
 * refunds for them is a "receive" payment and adds back in.
 *
 * A negative due means the supplier owes the shop.
 */

export const PAYMENT_TYPES = ["pay", "receive", "dismiss", "advance", "advance_refund"];

const PREFIX = {
  pay: "PAY",
  receive: "RCV",
  dismiss: "DSM",
  advance: "ADV",
  advance_refund: "ARF",
};

export const PAYMENT_LABEL = {
  pay: "Due Paid",
  receive: "Due Received",
  dismiss: "Due Dismiss",
  advance: "Advance Paid",
  advance_refund: "Advance Refund",
};

const PURCHASE_METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

const toIds = (ids) => ids.map((id) => new mongoose.Types.ObjectId(String(id)));

/** Balances for many suppliers at once, keyed by supplier id */
export async function supplierBalances(suppliers) {
  const ids = toIds(suppliers.map((supplier) => supplier._id));

  const [purchases, directPaid, payments, returns] = await Promise.all([
    PurchaseModel.aggregate([
      { $match: { supplierId: { $in: ids }, deletedAt: null, status: { $ne: "cancelled" } } },
      { $group: { _id: "$supplierId", total: { $sum: "$grandTotal" }, count: { $sum: 1 } } },
    ]),

    PurchaseModel.aggregate([
      { $match: { supplierId: { $in: ids }, deletedAt: null, status: { $ne: "cancelled" } } },
      { $unwind: "$payments" },
      { $match: { "payments.supplierPaymentId": null } },
      { $group: { _id: "$supplierId", paid: { $sum: "$payments.amount" } } },
    ]),

    SupplierPayment.aggregate([
      { $match: { supplierId: { $in: ids }, deletedAt: null } },
      { $group: { _id: { supplierId: "$supplierId", type: "$type" }, amount: { $sum: "$amount" } } },
    ]),

    PurchaseReturn.aggregate([
      { $match: { supplierId: { $in: ids }, deletedAt: null } },
      { $group: { _id: "$supplierId", total: { $sum: "$total" } } },
    ]),
  ]);
  const returnBy = new Map(returns.map((row) => [String(row._id), row.total]));

  const purchaseBy = new Map(purchases.map((row) => [String(row._id), row]));
  const directBy = new Map(directPaid.map((row) => [String(row._id), row.paid]));
  const paymentBy = new Map(
    payments.map((row) => [`${row._id.supplierId}:${row._id.type}`, row.amount]),
  );

  const balances = new Map();

  for (const supplier of suppliers) {
    const id = String(supplier._id);
    const sum = (type) => paymentBy.get(`${id}:${type}`) || 0;

    const purchaseTotal = purchaseBy.get(id)?.total || 0;
    const opening = Number(supplier.openingBalance) || 0;
    const total = opening + purchaseTotal;
    const paid = (directBy.get(id) || 0) + sum("pay");
    const dismiss = sum("dismiss");
    const received = sum("receive");
    const returned = returnBy.get(id) || 0;
    const advance =
      (Number(supplier.initialAdvance) || 0) + sum("advance") - sum("advance_refund");

    balances.set(id, {
      opening: round(opening),
      purchaseTotal: round(purchaseTotal),
      purchaseCount: purchaseBy.get(id)?.count || 0,
      total: round(total),
      paid: round(paid),
      tradeDue: round(total - paid),
      dismiss: round(dismiss),
      received: round(received),
      advance: round(advance),
      returned: round(returned),
      due: round(total - paid - dismiss - advance - returned + received),
    });
  }

  return balances;
}

export async function supplierBalance(supplier) {
  return (await supplierBalances([supplier])).get(String(supplier._id));
}

/** Checks a schedule form; shared by create and update */
export async function readSchedule(body) {
  if (!mongoose.isValidObjectId(body.supplierId)) return { error: "Select a supplier" };

  const supplier = await SupplierModel.findOne({ _id: body.supplierId, deletedAt: null })
    .select("_id")
    .lean();

  if (!supplier) return { error: "Supplier not found" };

  const scheduledAt = new Date(body.scheduledAt);

  if (!body.scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return { error: "Schedule date is required" };
  }

  return {
    data: {
      supplierId: supplier._id,
      scheduledAt,
      purpose: String(body.purpose || "").trim().slice(0, 255),
    },
  };
}

/** Purchases that still carry a due, oldest first */
export async function dueInvoices(supplierId) {
  const purchases = await PurchaseModel.find({
    supplierId,
    deletedAt: null,
    status: { $ne: "cancelled" },
    dueAmount: { $gt: 0.009 },
  })
    .select("purchaseNumber purchaseDate grandTotal paidAmount dismissAmount dueAmount")
    .sort({ purchaseDate: 1, createdAt: 1 })
    .lean();

  return purchases.map((purchase) => ({
    id: String(purchase._id),
    purchaseNumber: purchase.purchaseNumber,
    date: purchase.purchaseDate,
    total: round(purchase.grandTotal),
    due: round(purchase.dueAmount),
  }));
}

/**
 * Every line that moved the supplier's balance, oldest first, each with
 * the due it left behind. Lines before the start date are folded into the
 * opening figure.
 */
export async function supplierLedger(supplier, { start, end } = {}) {
  const lines = [];
  const openedOn = supplier.openingDate || supplier.createdAt;

  if (Number(supplier.openingBalance)) {
    lines.push({
      date: openedOn,
      type: "Opening Due",
      invoiceNo: "",
      note: "",
      amount: Number(supplier.openingBalance),
    });
  }

  if (Number(supplier.initialAdvance)) {
    lines.push({
      date: openedOn,
      type: "Opening Advance",
      invoiceNo: "",
      note: "",
      amount: -Number(supplier.initialAdvance),
    });
  }

  const [purchases, payments, returns] = await Promise.all([
    PurchaseModel.find({ supplierId: supplier._id, deletedAt: null, status: { $ne: "cancelled" } })
      .select("purchaseNumber purchaseDate grandTotal payments note createdAt")
      .lean(),
    SupplierPayment.find({ supplierId: supplier._id, deletedAt: null }).lean(),
    PurchaseReturn.find({ supplierId: supplier._id, deletedAt: null })
      .select("returnNumber returnDate total note")
      .lean(),
  ]);

  for (const ret of returns) {
    lines.push({
      date: ret.returnDate,
      type: "Purchase Return",
      invoiceNo: ret.returnNumber,
      note: ret.note || "",
      amount: -(Number(ret.total) || 0),
    });
  }

  for (const purchase of purchases) {
    lines.push({
      date: purchase.purchaseDate || purchase.createdAt,
      type: "Purchase",
      invoiceNo: purchase.purchaseNumber,
      note: purchase.note || "",
      amount: Number(purchase.grandTotal) || 0,
    });

    for (const payment of purchase.payments || []) {
      if (payment.supplierPaymentId) continue;

      lines.push({
        date: payment.paidAt || purchase.purchaseDate,
        type: "Purchase Payment",
        invoiceNo: purchase.purchaseNumber,
        note: payment.note || "",
        method: payment.method,
        amount: -(Number(payment.amount) || 0),
      });
    }
  }

  for (const payment of payments) {
    const reducesDue = ["pay", "dismiss", "advance"].includes(payment.type);
    const against = payment.allocations.map((row) => row.purchaseNumber).join(", ");

    lines.push({
      date: payment.date,
      type: PAYMENT_LABEL[payment.type],
      invoiceNo: payment.invoiceNo,
      note: [payment.note, against && `For ${against}`].filter(Boolean).join(" · "),
      method: payment.type === "dismiss" ? "" : payment.method,
      amount: reducesDue ? -payment.amount : payment.amount,
    });
  }

  lines.sort((a, b) => new Date(a.date) - new Date(b.date));

  const from = start ? new Date(`${start}T00:00:00`) : null;
  const to = end ? new Date(`${end}T23:59:59.999`) : null;

  let balance = 0;
  let opening = 0;
  const rows = [];

  for (const line of lines) {
    const when = new Date(line.date);

    if (from && when < from) {
      opening += line.amount;
      balance += line.amount;
      continue;
    }

    if (to && when > to) continue;

    balance += line.amount;
    rows.push({ ...line, amount: round(line.amount), balance: round(balance) });
  }

  const inPeriod = (type) =>
    round(rows.filter((row) => row.type === type).reduce((sum, row) => sum + row.amount, 0));

  return {
    rows,
    summary: {
      opening: round(opening),
      totalPurchase: inPeriod("Purchase"),
      totalPaid: round(-(inPeriod("Purchase Payment") + inPeriod(PAYMENT_LABEL.pay))),
      dismiss: round(-inPeriod(PAYMENT_LABEL.dismiss)),
      returned: round(-inPeriod("Purchase Return")),
      received: inPeriod(PAYMENT_LABEL.receive),
      advance: round(
        -(inPeriod(PAYMENT_LABEL.advance) + inPeriod("Opening Advance")) -
          inPeriod(PAYMENT_LABEL.advance_refund),
      ),
      due: round(balance),
    },
  };
}

/**
 * Saves a supplier payment and writes its purchase shares.
 *
 * Every check runs before anything is written, so a bad share cannot
 * leave half the purchases updated.
 */
export async function createSupplierPayment({ supplier, type, body, createdBy }) {
  if (!PAYMENT_TYPES.includes(type)) throw new Error("Unknown payment type");

  const amount = round(body.amount);

  if (!(amount > 0)) throw new Error("Enter an amount greater than 0");

  const balance = await supplierBalance(supplier);

  if (type === "dismiss" && amount - Math.max(0, balance.due) > 0.009) {
    throw new Error(`Only ${Math.max(0, balance.due)} is due to this supplier`);
  }

  if (type === "receive" && amount - Math.max(0, -balance.due) > 0.009) {
    throw new Error(
      balance.due >= 0
        ? "This supplier owes the shop nothing, so there is nothing to receive"
        : `Only ${-balance.due} is receivable from this supplier`,
    );
  }

  if (type === "advance_refund" && amount - balance.advance > 0.009) {
    throw new Error(`The advance with this supplier is only ${balance.advance}`);
  }

  // Shares only make sense when paying or dismissing a purchase due
  const shares = [];

  if (type === "pay" || type === "dismiss") {
    for (const raw of Array.isArray(body.allocations) ? body.allocations : []) {
      const share = round(raw?.amount);

      if (!(share > 0)) continue;

      if (!mongoose.isValidObjectId(raw?.purchaseId)) throw new Error("An invoice is invalid");

      const purchase = await PurchaseModel.findOne({
        _id: raw.purchaseId,
        supplierId: supplier._id,
        deletedAt: null,
        status: { $ne: "cancelled" },
      });

      if (!purchase) throw new Error("An invoice no longer belongs to this supplier");

      if (share - purchase.dueAmount > 0.009) {
        throw new Error(`${purchase.purchaseNumber}: only ${purchase.dueAmount} is due`);
      }

      shares.push({ purchase, amount: share });
    }

    const shared = shares.reduce((sum, row) => sum + row.amount, 0);

    if (shared - amount > 0.009) {
      throw new Error("The invoice amounts add up to more than the payment");
    }
  }

  const method = type === "dismiss" ? "other" : body.method || "cash";
  const date = body.date ? new Date(body.date) : new Date();

  const payment = await SupplierPayment.create({
    invoiceNo: await nextDocumentNumber(PREFIX[type], `supplier_${type}`),
    supplierId: supplier._id,
    type,
    amount,
    method,
    reference: String(body.reference || "").trim(),
    note: String(body.note || "").trim(),
    date,
    allocations: shares.map((row) => ({
      purchaseId: row.purchase._id,
      purchaseNumber: row.purchase.purchaseNumber,
      amount: row.amount,
    })),
    createdBy,
  });

  for (const { purchase, amount: share } of shares) {
    if (type === "pay") {
      purchase.payments.push({
        amount: share,
        method: PURCHASE_METHODS.includes(method) ? method : "other",
        reference: payment.reference,
        note: `Supplier payment ${payment.invoiceNo}`,
        paidAt: date,
        createdBy,
        supplierPaymentId: payment._id,
      });
    } else {
      purchase.dismissAmount = round(Number(purchase.dismissAmount || 0) + share);
    }

    purchase.recalculateTotals();
    await purchase.save();
  }

  return payment;
}

/** Deletes a supplier payment and takes its shares back off the purchases */
export async function deleteSupplierPayment(payment) {
  if (payment.type === "advance") {
    const supplier = await SupplierModel.findById(payment.supplierId);
    const balance = supplier ? await supplierBalance(supplier) : null;

    if (balance && balance.advance - payment.amount < -0.009) {
      throw new Error("Part of this advance was already refunded; delete that refund first");
    }
  }

  for (const share of payment.allocations) {
    const purchase = await PurchaseModel.findById(share.purchaseId);

    if (!purchase) continue;

    if (payment.type === "pay") {
      purchase.payments = purchase.payments.filter(
        (row) => String(row.supplierPaymentId) !== String(payment._id),
      );
    } else if (payment.type === "dismiss") {
      purchase.dismissAmount = Math.max(0, round(Number(purchase.dismissAmount || 0) - share.amount));
    }

    purchase.recalculateTotals();
    await purchase.save();
  }

  payment.deletedAt = new Date();
  await payment.save();

  // a refund taken with a purchase return: that return no longer has one
  if (payment.type === "receive") {
    await PurchaseReturn.updateOne(
      { refundPaymentId: payment._id },
      { $set: { refundAmount: 0, refundPaymentId: null } },
    );
  }
}

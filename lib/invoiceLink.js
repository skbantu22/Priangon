import crypto from "crypto";

// Public invoice links carry a signature, so nobody can open other customers'
// invoices by counting through INV-000001, INV-000002, ...
const sign = (orderNumber) =>
  crypto
    .createHmac("sha256", process.env.SECRET_KEY || "invoice")
    .update(String(orderNumber))
    .digest("base64url")
    .slice(0, 16);

export const invoicePath = (orderNumber) =>
  `/invoice/${encodeURIComponent(orderNumber)}?t=${sign(orderNumber)}`;

export const isValidInvoiceToken = (orderNumber, token) => {
  const expected = Buffer.from(sign(orderNumber));
  const given = Buffer.from(String(token || ""));
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
};

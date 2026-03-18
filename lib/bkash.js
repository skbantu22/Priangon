// lib/bkash.js
export async function getBkashIdToken() {
  const BASE = (process.env.BKASH_BASE_URL || "").replace(/\/+$/, ""); // trim trailing /
  const VERSION = "/v1.2.0-beta";

  const USERNAME = process.env.BKASH_CHECKOUT_URL_USER_NAME;
  const PASSWORD = process.env.BKASH_CHECKOUT_URL_PASSWORD;
  const APP_KEY = process.env.BKASH_CHECKOUT_URL_APP_KEY;
  const APP_SECRET = process.env.BKASH_CHECKOUT_URL_APP_SECRET;

  if (!BASE || !USERNAME || !PASSWORD || !APP_KEY || !APP_SECRET) {
    throw new Error("Missing bKash env (BASE/USERNAME/PASSWORD/APP_KEY/APP_SECRET)");
  }

  const url = `${BASE}${VERSION}/tokenized/checkout/token/grant`;
  console.log("bKash token grant URL:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: USERNAME,
      password: PASSWORD,
    },
    body: JSON.stringify({
      app_key: APP_KEY,
      app_secret: APP_SECRET,
    }),
    cache: "no-store",
  });

  const raw = await response.text(); // ✅ always read as text first
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch {
    data = { raw }; // ✅ if not json, show raw
  }

  if (!response.ok) {
    console.error("bKash token grant failed:", {
      httpStatus: response.status,
      data,
    });
    throw new Error(data?.statusMessage || data?.message || `bKash token grant failed (HTTP ${response.status})`);
  }

  const idToken = data?.id_token;
 if (!idToken) {
  console.error("bKash token response FULL:", JSON.stringify(data, null, 2));
  throw new Error("bKash token missing id_token");
}


  return `Bearer ${idToken}`;
}

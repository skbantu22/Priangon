/**
 * Bangladesh formatting rules, kept in one place so every page and every
 * printed document agrees.
 *
 * Grouping: BD writes amounts in lakh and crore (1,23,45,678), which is the
 * en-IN grouping. en-BD groups in thousands (12,345,678) and is wrong here.
 * bn-BD gives the same lakh/crore grouping in Bengali digits.
 */

export const BDT_SYMBOL = "৳";

// Standard VAT (Mushak) rate in Bangladesh
export const BD_VAT_RATE = 15;

const LATIN_LOCALE = "en-IN";
const BENGALI_LOCALE = "bn-BD";

export const formatNumberBD = (value, { bengaliDigits = false } = {}) => {
  const number = Number(value) || 0;

  return new Intl.NumberFormat(
    bengaliDigits ? BENGALI_LOCALE : LATIN_LOCALE,
    { maximumFractionDigits: 2 },
  ).format(number);
};

export const formatTaka = (
  value,
  { bengaliDigits = false, decimals = false } = {},
) => {
  const number = Number(value) || 0;

  const text = new Intl.NumberFormat(
    bengaliDigits ? BENGALI_LOCALE : LATIN_LOCALE,
    {
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    },
  ).format(number);

  return `${BDT_SYMBOL} ${text}`;
};

/** Short form for chart axes: 1.2L, 45k, 3.4Cr */
export const formatTakaCompact = (value) => {
  const number = Number(value) || 0;
  const abs = Math.abs(number);

  if (abs >= 10000000) return `${(number / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000) return `${(number / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${Math.round(number / 1000)}k`;

  return String(Math.round(number));
};

/** BD writes dates day first */
export const formatDateBD = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${day}/${month}/${date.getFullYear()}`;
};

export const formatDateTimeBD = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${formatDateBD(date)} ${hour12}:${minutes} ${suffix}`;
};

/* =========================
   MOBILE NUMBERS
========================= */

const BD_OPERATORS = {
  "013": "Grameenphone",
  "017": "Grameenphone",
  "014": "Banglalink",
  "019": "Banglalink",
  "015": "Teletalk",
  "016": "Airtel",
  "018": "Robi",
};

/** Turns +8801712345678, 8801712345678 or 01712345678 into 01712345678 */
export const normalizeBdMobile = (input) => {
  const digits = String(input || "").replace(/\D/g, "");

  if (digits.length === 13 && digits.startsWith("880")) {
    return digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("01")) {
    return digits;
  }

  if (digits.length === 10 && digits.startsWith("1")) {
    return `0${digits}`;
  }

  return digits;
};

export const isValidBdMobile = (input) =>
  /^01[3-9]\d{8}$/.test(normalizeBdMobile(input));

export const bdOperator = (input) => {
  const phone = normalizeBdMobile(input);

  return BD_OPERATORS[phone.slice(0, 3)] || "";
};

/* =========================
   BUSINESS IDENTIFIERS
========================= */

/** NBR issues a 13 digit Business Identification Number */
export const isValidBIN = (input) =>
  /^\d{13}$/.test(String(input || "").replace(/\D/g, ""));

/** NBR issues a 12 digit e-TIN */
export const isValidTIN = (input) =>
  /^\d{12}$/.test(String(input || "").replace(/\D/g, ""));

/** National ID is 10, 13 or 17 digits depending on when it was issued */
export const isValidNID = (input) => {
  const digits = String(input || "").replace(/\D/g, "");

  return [10, 13, 17].includes(digits.length);
};

/** GSM IMEI is 15 digits and carries a Luhn check digit */
export const isValidIMEI = (input) => {
  const digits = String(input || "").replace(/\D/g, "");

  if (!/^\d{15}$/.test(digits)) return false;

  let sum = 0;

  for (let i = 0; i < 15; i += 1) {
    let value = Number(digits[i]);

    // Double every second digit counting from the left
    if (i % 2 === 1) {
      value *= 2;
      if (value > 9) value -= 9;
    }

    sum += value;
  }

  return sum % 10 === 0;
};

/* =========================
   FISCAL YEAR — BD runs July to June
========================= */

export const fiscalYearRange = (value = new Date()) => {
  const date = new Date(value);
  const month = date.getMonth(); // 0 = January, 6 = July

  const startYear = month >= 6 ? date.getFullYear() : date.getFullYear() - 1;

  return {
    from: new Date(startYear, 6, 1, 0, 0, 0, 0),
    to: new Date(startYear + 1, 5, 30, 23, 59, 59, 999),
    label: `${startYear}-${String(startYear + 1).slice(2)}`,
  };
};

/** Friday and Saturday are the weekend in Bangladesh */
export const isBdWeekend = (value = new Date()) => {
  const day = new Date(value).getDay(); // 5 = Friday, 6 = Saturday

  return day === 5 || day === 6;
};

/* =========================
   VAT (MUSHAK)
========================= */

/** Price already includes VAT, so pull the VAT back out of it */
export const vatFromInclusive = (amount, rate = BD_VAT_RATE) => {
  const value = Number(amount) || 0;

  return (value * rate) / (100 + rate);
};

export const vatOnExclusive = (amount, rate = BD_VAT_RATE) =>
  ((Number(amount) || 0) * rate) / 100;

/* =========================
   AMOUNT IN WORDS — needed on vouchers and challans
========================= */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty",
  "Ninety",
];

const twoDigits = (n) => {
  if (n < 20) return ONES[n];

  const ten = Math.floor(n / 10);
  const one = n % 10;

  return TENS[ten] + (one ? ` ${ONES[one]}` : "");
};

/** "Taka One Lakh Twenty Three Thousand Only" — lakh/crore, not million */
export const takaInWords = (value) => {
  const total = Math.round(Number(value) || 0);

  if (total === 0) return "Taka Zero Only";

  const sign = total < 0 ? "Minus " : "";
  let amount = Math.abs(total);

  const parts = [];

  const crore = Math.floor(amount / 10000000);
  amount %= 10000000;

  const lakh = Math.floor(amount / 100000);
  amount %= 100000;

  const thousand = Math.floor(amount / 1000);
  amount %= 1000;

  const hundred = Math.floor(amount / 100);
  const rest = amount % 100;

  if (crore) parts.push(`${twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(`${ONES[hundred]} Hundred`);
  if (rest) parts.push(twoDigits(rest));

  return `${sign}Taka ${parts.join(" ")} Only`;
};

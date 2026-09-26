/**
 * Every document number reads like IN-27921790440936: "IN-" and 14 digits
 * (the time in milliseconds and one random digit), for sales, purchases,
 * returns, payments, expenses and the rest alike. Numbers never repeat and
 * a newer one is always larger, without a shared counter.
 */
export const longNumber = () => `IN-${Date.now()}${Math.floor(Math.random() * 10)}`;

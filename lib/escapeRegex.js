/**
 * Escapes a user supplied string so it can sit inside a regular expression.
 *
 * Duplicate checks build `new RegExp(`^${name}$`, "i")` from whatever was
 * typed. A name like "C++" or "Nokia (HMD)" is not a valid pattern, so the
 * RegExp constructor throws and the route answers 500 instead of saving.
 * Even when it parses, an unescaped "." would match any character and
 * report a duplicate that does not exist.
 */
export const escapeRegex = (value) =>
  String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** `^value$` with the value escaped — the exact-match check used everywhere */
export const exactRegex = (value, flags = "i") =>
  new RegExp(`^${escapeRegex(value)}$`, flags);

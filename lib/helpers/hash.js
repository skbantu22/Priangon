import crypto from "crypto";

export const hashData = (data) => {
  if (!data) return undefined;

  return crypto
    .createHash("sha256")
    .update(data.trim().toLowerCase())
    .digest("hex");
};

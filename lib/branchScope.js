import mongoose from "mongoose";

/**
 * The shop switch at the top of the admin, turned into a Mongo match.
 *
 * Every figure the switch narrows down — sales, purchases, receipts, dues —
 * goes through here, so one shop's book can never pick up another shop's
 * rows. Three shapes of answer:
 *
 *   "" or "all"   every shop together, so no filter at all
 *   "warehouse"   the rows kept at the warehouse, where the field is unset
 *   <ObjectId>    that one showroom
 *
 * Rows saved before shops existed have no showroom on them, so they count
 * as the warehouse's — the same rule the category and brand lists use.
 */

export const ALL_SHOPS = "all";
export const WAREHOUSE = "warehouse";

/** True when the scope means "do not narrow anything down" */
export const isEveryShop = (showroomId) => {
  const id = String(showroomId ?? "");
  return id === "" || id === ALL_SHOPS;
};

/** True when the scope is one real showroom rather than the warehouse */
export const isShowroom = (showroomId) =>
  !isEveryShop(showroomId) && mongoose.isValidObjectId(String(showroomId));

/**
 * A match for documents that carry the shop as an ObjectId field
 * (`showroomId` on orders, purchases, payments, returns).
 */
export const shopMatch = (showroomId, field = "showroomId") => {
  if (isEveryShop(showroomId)) return {};

  if (!isShowroom(showroomId)) return { [field]: null };

  return { [field]: new mongoose.Types.ObjectId(String(showroomId)) };
};

/**
 * Does a document belong to this scope? For the opening dues, which sit on
 * the customer or supplier rather than on a transaction.
 */
export const inShop = (showroomId, value) => {
  if (isEveryShop(showroomId)) return true;

  const theirs = value == null ? "" : String(value);

  return isShowroom(showroomId) ? theirs === String(showroomId) : theirs === "";
};

/** The same scope as a plain string, for the fields that keep it that way */
export const shopKeyMatch = (showroomId, field = "showroomId") => {
  if (isEveryShop(showroomId)) return {};

  if (!isShowroom(showroomId)) return { [field]: { $in: [WAREHOUSE, null, ""] } };

  return { [field]: String(showroomId) };
};

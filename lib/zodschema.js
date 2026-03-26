import { z } from "zod";

/* ✅ number input string/number দুইটাই accept করবে */
const numberLike = z.union([
  z.number(),
  z
    .string()
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val), "Please enter a valid number."),
]);

export const zSchema = z.object({
  _id: z.string().min(3, "_id is required."),

  name: z.string().min(2, "Name must be at least 2 characters"),

  email: z.string().email("Invalid email address"),

  password: z.string().min(4, "Password must be at least 4 characters"),

  title: z.string().min(3, "Title is required."),

  slug: z.string().min(3, "Slug is required."),

  /* ✅ Media Alt */
  alt: z.string().min(3, "Alt is required."),

  subcategories: z.array(z.string().min(3)).optional().default([]),

  /* ✅ Product Category */
  category: z.string().min(3, "Category is required."),

  /* ✅ NEW: Sub Category */
  subcategory: z.string().min(3, "SubCategory is required."),
  /* ✅ NEW: Category id */
  categoryId: z.string().min(1, "Category required"),

  /* ✅ Pricing Fields */
  mrp: numberLike.refine((v) => v >= 0, "MRP must be 0 or more"),

  sellingPrice: numberLike.refine(
    (v) => v >= 0,
    "Selling price must be 0 or more",
  ),

  discountPercentage: numberLike.refine(
    (v) => v >= 0,
    "Discount must be 0 or more",
  ),

  /* ✅ Description */
  description: z.string().min(3, "Description is required"),

  /* ✅ Media Array */
  media: z.array(z.string()).min(1, "At least 1 media is required"),

  /* ✅ NEW: Offers (Mega Deal, New Arrival etc.) */
  offers: z
    .array(z.enum(["mega", "new", "top", "free", "valentine"]))
    .optional(),

  /* ✅ NEW: Free Delivery */
  freeDelivery: z.boolean().optional(),

  /* ✅ Product Variant Fields */
  product: z.string().min(3, "Product is required."),
  stock: z.coerce.number().int().min(0, "Stock must be >= 0"),
  isActive: z.boolean().optional(),

  color: z.string().min(3, "Color is required."),

  size: z.string().min(1, "Size is required."),

  sku: z.string().min(3, "SKU is required."),

  otp: z.string().regex(/^\d{6}$/, {
    message: "OTP must be a 6-digit number",
  }),
  code: z.string().min(3, "Code is required."),

  minShoppingAmount: z.union([
    z.number().positive("Expected positive value, received negative."),
    z
      .string()
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val) && val >= 0),
  ]),

  amount: z.union([
    z.number().positive("Expected positive value, received negative."),
    z
      .string()
      .transform((val) => Number(val))
      .refine((val) => !isNaN(val) && val >= 0),
  ]),

  validity: z.coerce.date(),
  phone: z.string().min(10, "Phone number is required."),

  address: z.string().min(3, "Address is required."),
  city: z.string().min(3, "City is required."),

  sizeChart: z.string().optional().or(z.literal("")),
});

import { z } from "zod";
import { zSchema } from "@/lib/zodschema";

// shared by the admin "add product" and "edit product" forms
export const productFormSchema = zSchema
  .pick({
    name: true,
    slug: true,
    category: true,
    mrp: true,
    sellingPrice: true,
    discountPercentage: true,
    description: true,
    media: true,
    freeDelivery: true,
  })
  .extend({
    subcategory: z.string().optional().or(z.literal("")),
    brand: z.string().max(60).optional().or(z.literal("")),
    warrantyType: z.enum(["none", "official", "brand", "shop"]),
    warrantyMonths: z.coerce.number().min(0).max(120),
    trackSerial: z.boolean(),
  });

// product document -> the brand / warranty form fields
export const mobileFieldsFromProduct = (product) => ({
  brand: product?.brand || "",
  warrantyType: product?.warranty?.type || "none",
  warrantyMonths: product?.warranty?.months || 0,
  trackSerial: !!product?.trackSerial,
});

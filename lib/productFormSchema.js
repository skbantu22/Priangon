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
    // made from the name when saving; the form has no slug box
    slug: z.string().optional().or(z.literal("")),
    subcategory: z.string().optional().or(z.literal("")),
    // a POS shop needs no photo or write-up; without a photo the product
    // simply stays off the website
    description: z.string().optional().or(z.literal("")),
    media: z.array(z.string()).optional(),
    brand: z.string().max(60).optional().or(z.literal("")),
    warrantyType: z.enum(["none", "official", "brand", "shop"]),
    warrantyMonths: z.coerce.number().min(0).max(120),
    trackSerial: z.boolean(),
    // price list (empty = not set)
    purchasePrice: z.coerce.number().min(0).optional(),
    dealerPrice: z.coerce.number().min(0).optional(),
    subDealerPrice: z.coerce.number().min(0).optional(),
    wholesalerPrice: z.coerce.number().min(0).optional(),
    // unit / type / codes / stock alert
    productType: z.enum(["simple", "variant"]),
    unit: z.string().min(1, "Unit is required").max(20),
    code: z.string().max(40).optional().or(z.literal("")),
    rackNo: z.string().max(30).optional().or(z.literal("")),
    weight: z.coerce.number().min(0).optional(),
    alertQuantity: z.coerce.number().min(0).optional(),
    minSalePrice: z.coerce.number().min(0).optional(),
    showInWebsite: z.boolean(),
  });

// product document -> the brand / warranty form fields
export const mobileFieldsFromProduct = (product) => ({
  brand: product?.brand || "",
  warrantyType: product?.warranty?.type || "none",
  warrantyMonths: product?.warranty?.months || 0,
  trackSerial: !!product?.trackSerial,
});

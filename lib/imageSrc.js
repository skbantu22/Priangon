// next/image cannot optimise SVGs, and Cloudinary already serves optimised
// images: both are rendered as-is
export const skipOptimize = (src) =>
  /cloudinary\.com|\.svg($|\?)/i.test(String(src || ""));

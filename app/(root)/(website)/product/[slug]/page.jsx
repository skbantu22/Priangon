"use client";
import React, { useEffect, useState } from "react";
import ProductDetails from "./ProductDetails";

const ProductPage = ({ params }) => {
  const { slug } = params;
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/product/details/${slug}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error(err));
  }, [slug]);

  if (!data) return <div className="text-center py-20">Loading...</div>;
  if (!data.success || !data.data) return <div className="text-center py-20">Product not found</div>;

  const { product, variant, colors, sizes, allVariants } = data.data;

  return (
    <main>
      <ProductDetails
        product={product}
        initialVariant={variant}
        allVariants={allVariants}
        colors={colors}
        sizes={sizes}
      />
    </main>
  );
};

export default ProductPage;
import React from 'react';
import ProductDetails from './ProductDetails';

const ProductPage = async ({ params }) => {
  const { slug } = await params;

  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/product/details/${slug}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 }, // caching
    });

    const result = await response.json();

    if (!result.success || !result.data) {
      return (
        <div className='flex justify-center items-center py-20'>
          <h1 className='text-2xl font-semibold text-gray-500'>Product not found.</h1>
        </div>
      );
    }

    const { product, variant, colors, sizes, allVariants, similarProducts } = result.data;

    console.log("Similar products:", similarProducts);

    return (
      <main>
        <ProductDetails
          product={product}
          initialVariant={variant}
          allVariants={allVariants}
          colors={colors}
          sizes={sizes}
          similarProducts={similarProducts} // ✅ pass it here
        />
      </main>
    );
  } catch (error) {
    console.error("Fetch error:", error);
    return <div className="text-center py-20">Something went wrong.</div>;
  }
};

export default ProductPage;
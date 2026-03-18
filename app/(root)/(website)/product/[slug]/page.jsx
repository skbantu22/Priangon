import React from 'react';
import ProductDetails from './ProductDetails';

const ProductPage = async ({ params }) => {
  // Extract slug correctly (Next.js 15+ requires awaiting params)
  const { slug } = await params;

  // Fetch the product details. 
  // IMPORTANT: Ensure your backend API returns an "allVariants" array in the data.
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/product/details/${slug}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 }, // ✅ enables caching
    });

    const result = await response.json();

    if (!result.success || !result.data) {
      return (
        <div className='flex justify-center items-center py-20'>
          <h1 className='text-2xl font-semibold text-gray-500'>Product not found.</h1>
        </div>
      );
    }

    const { product, variant, colors, sizes, allVariants } = result.data;

    console.log(result.data)
    return (
      <main>
        <ProductDetails
          product={product}
          initialVariant={variant}
          allVariants={allVariants} // New prop: contains every variant (color/size combo)
          colors={colors}
          sizes={sizes}
        />
      </main>
    );
  } catch (error) {
    console.error("Fetch error:", error);
    return <div className="text-center py-20">Something went wrong.</div>;
  }
};

export default ProductPage;
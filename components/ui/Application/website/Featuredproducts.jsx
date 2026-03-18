
import axios from 'axios';
import Link from 'next/link';
import React from 'react';
import { IoIosArrowRoundForward } from "react-icons/io";
import ProductBox from './ProductBox';

const Featuredproducts = async () => {
  let productData = null;

  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/product/get-featured-product`
    );
    productData = response.data;
  } catch (error) {
    console.error("Failed to fetch featured products:", error);
    productData = { success: false, data: [] }; // fallback so build won't fail
  }

  return (
    <div>
      <section className='lg:px-32 px-4 sm:py-4'>
        <div className='flex justify-between'>
          <h1 className='sm:text-4xl text-2xl font-semibold'>Featured Products</h1>

          <Link href="#" className='flex items-center hover:text-primary gap-2'>
            View All
            <IoIosArrowRoundForward />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
          {!productData?.success || !productData?.data?.length ? (
            <div className="text-center py-5 col-span-full">Data not found</div>
          ) : (
            productData.data.map((product) => (
              <ProductBox key={product._id} product={product} />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Featuredproducts;
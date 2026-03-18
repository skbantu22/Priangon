import axios from 'axios';
import Link from 'next/link';
import React from 'react';
import { IoIosArrowRoundForward } from "react-icons/io";
import ProductBox from './ProductBox';

const Jewelleryproducts = async () => {
  let productData = null;

  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/product/by-category?category=women&subcategory=jewellery&limit=4`
    );
    productData = response.data;
  } catch (error) {
    console.error("Failed to fetch jewellery products:", error);
    // Optionally, you can set productData to a default value or show an error message
    productData = { success: false, data: [] };
  }

  if (!productData) return null;

  return (
    <div>
      <section className='lg:px-32 px-4 sm:py-4'>
        <div className='flex justify-between'>
          <h1 className='sm:text-4xl text-2xl font-semibold'>Jewellery</h1>

          <Link href="#" className='flex items-center hover:text-primary gap-2'>
            View All
            <IoIosArrowRoundForward />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-6">
          {!productData?.success ? (
            <div className="text-center py-5 col-span-full">Data not found</div>
          ) : (
            productData?.data?.map((product) => (
              <ProductBox key={product._id} product={product} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default Jewelleryproducts;
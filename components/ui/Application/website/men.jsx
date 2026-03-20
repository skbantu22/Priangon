import Link from "next/link";
import React from "react";
import { IoIosArrowRoundForward } from "react-icons/io";
import ProductBox from "./ProductBox";

const MenProducts = async () => {
  let productData = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/product/by-category?category=men&limit=4`,
      {
        cache: "no-store", // 🔥 prevents build-time fetch
      }
    );

    productData = await res.json();
  } catch (error) {
    console.log("Men API Error:", error.message);
    return null; // ✅ prevents crash
  }

  if (!productData) return null;

  return (
    <div>
      <section className="">
        <div className="flex justify-between px-2">
          <h1 className="text-xl md:text-2xl font-semibold">
            Mens
          </h1>

          <Link
            href=""
            className="flex items-center hover:text-primary gap-2"
          >
            View All
            <IoIosArrowRoundForward />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2  px-2">
          {!productData?.success ? (
            <div className="text-center py-5 col-span-full">
              Data not found
            </div>
          ) : (
            productData?.data?.map((product) => (
              <ProductBox key={product._id} product={product} />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default MenProducts;
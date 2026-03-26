import Link from "next/link";
import React from "react";
import { IoIosArrowRoundForward } from "react-icons/io";
import ProductBox from "./ProductBox";
import HomeSlider from "./Homeslider";

const MenProducts = async () => {
  let productData = null;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/product/get-featured-product`,

      {
        cache: "no-store", // 🔥 prevents build-time fetch
      },
    );

    productData = await res.json();
    console.log("FeaturedProducts Data:", productData); // ✅ debug
  } catch (error) {
    console.log("Featured Products API Error:", error.message);
    return null; // ✅ prevents crash
  }

  if (!productData) return null;

  return (
    <div>
      <section className="px-1 lg:px-3">
        <div className="flex justify-center items-center px-2 text-center">
          <h1 className="text-xl md:text-2xl font-semibold">New Arrivals</h1>
        </div>

        <div className="px-2">
          {!productData?.success ? (
            <div className="text-center py-5">Data not found</div>
          ) : (
            <HomeSlider products={productData?.data} />
          )}
        </div>
      </section>
    </div>
  );
};

export default MenProducts;

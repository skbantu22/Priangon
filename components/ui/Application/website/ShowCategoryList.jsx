"use client";

import Image from "next/image";
import Link from "next/link";

 const categories = [
    { title: "Women", image: "/assets/images/women.webp", link: "shop?category=women" },
    { title: "Saree", image: "/assets/images/saree4.webp", link: "shop?category=women" },
    { title: "Kids", image: "/assets/images/kids.webp", link: "shop?category=women" },
    { title: "Gift-Package", image: "/assets/images/gift-package.jpg", link: "/category/newborn" },
    { title: "Men", image: "/assets/images/men.webp", link: "/shop?category=men" },
    { title: "Home", image: "/assets/images/home-decor.webp", link: "/shop?category=women" },
    { title: "Jewelary", image: "/assets/images/jewelary.jpg", link: "/shop?category=women" },
    { title: "Accessories", image: "/assets/images/accessories.webp", link: "/shop?category=women" },
  ];

export default function CategoryGrid() {
  return (
    <div className="px-3 md:px-6 py-4 md:py-12">
{/* Header */}
  <div className="flex items-center gap-4 md:gap-6 mb-3 md:mb-10">
        <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-black to-transparent" />

        <div className="flex items-center gap-2 md:gap-3">
          
          <h2 className="text-sm md:text-xl  tracking-[0.4em] lg:tracking-[0.3em] text-black uppercase">
            Top Categories
          </h2>
        </div>

        <div className="flex-1 h-[2px] bg-gradient-to-l from-transparent via-black to-transparent" />
      </div>


       <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 p-2">



      {categories.map((cat, index) => (
        <Link
          href={cat.link}
          key={index}
          className="relative overflow-hidden  group h-32 md:h-60 lg:h-72"
        >
          <Image
            src={cat.image}
            alt={cat.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {/* Title at bottom */}
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="text-white  text-lg md:text-xl text-center">
              {cat.title}
            </h3>
          </div>


        </Link>
      ))}
    </div>

    </div>
   
  );
}
"use client";

import Image from "next/image";
import Link from "next/link";

 const categories = [
    
    { title: "Eid Collection", image: "/assets/images/saree4.webp", link: "shop?category=women" },

    { title: "Eid Jewelary Collection", image: "/assets/images/jewelary.jpg", link: "/shop?category=women" },

  ];

export default function CategoryGrid() {
  return (
    <div className="px-1 md:px-2 ">



       <div className="grid grid-cols-2  gap-2 md:gap-3 p-2">



      {categories.map((cat, index) => (
        <Link
          href={cat.link}
          key={index}
          className="relative overflow-hidden  group h-32 md:h-100 lg:h-110"
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
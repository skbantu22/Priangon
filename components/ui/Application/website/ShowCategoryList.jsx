import Image from "next/image";
import Link from "next/link";

export default function ShowCategoryList() {
  const categories = [
    { title: "Women", image: "/assets/images/women.webp", link: "/category/women" },
    { title: "Ethnic Pieces", image: "/assets/images/ethnic.webp", link: "/category/ethnic" },
    { title: "Kids", image: "/assets/images/kids.webp", link: "/category/kids" },
    { title: "Gift-Package", image: "/assets/images/gift-package.jpg", link: "/category/newborn" },
    { title: "Men", image: "/assets/images/men.webp", link: "/category/men" },
    { title: "Home", image: "/assets/images/home-decor.webp", link: "/category/home" },
    { title: "Jewelary", image: "/assets/images/jewelary.jpg", link: "/category/lawn" },
    { title: "Accessories", image: "/assets/images/accessories.webp", link: "/category/family" },
  ];

  return (
      <main className=" mx-auto px-3 md:px-6 py-6 md:py-12">
  {/* Header */}
  <div className="flex items-center gap-4 md:gap-6 mb-6 md:mb-10">
        {/* Left line */}
        <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-gray-400 to-transparent" />

        {/* Center */}
        <div className="flex items-center gap-2 md:gap-3">
         
          <h2 className="text-sm md:text-base font-bold tracking-[0.3em] text-black uppercase">
            Top Categories
          </h2>
        </div>

        {/* Right line */}
        <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-gray-400 to-transparent" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat, index) => {
          // Add extra bottom margin after every 4th item on large screens
          const extraMargin = (index + 1) % 4 === 0 ? "lg:mb-8" : "";

          return (
            <Link href={cat.link} key={index} className={`block ${extraMargin}`}>
              <div className="relative group overflow-hidden cursor-pointer">
                <Image
                  src={cat.image}
                  alt={cat.title}
                  width={300}
                  height={300}
                  className="w-full h-[300px] object-cover group-hover:scale-105 transition duration-500"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition" />

                {/* Title */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-lg font-medium tracking-wide">
                  {cat.title}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
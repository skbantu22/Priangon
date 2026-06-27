import Image from "next/image";
import { useEffect, useRef } from "react";

export default function ProductGallery({
  products,
  loading,
  search,
  setSearch,
  setOpenProduct,
  addToCart,
  inputRef, // 👈 Parent (POSPage) থেকে আসা inputRef রিসিভ করা হচ্ছে
}) {
  const typingTimeout = useRef(null);
  const focusLock = useRef(false);

  // ---------------- FOCUS HELPER ----------------
  // ইনপুট বক্সে ফোকাস ফিরিয়ে আনার জন্য রি-ইউজেবল সেফ ফাংশন
  const keepFocus = () => {
    if (inputRef?.current) {
      requestAnimationFrame(() => {
        inputRef.current.focus();
      });
    }
  };

  // ---------------- BARCODE SCANNER ----------------
  useEffect(() => {
    const code = search.trim();

    if (!code) return;

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      // 💡 এরর ফিক্স: products-কে ক্লোজার স্কোপ থেকে সরাসরি রিড করা হচ্ছে
      const found = products?.find((product) =>
        product.variants?.some((v) => String(v.barcode) === code),
      );

      if (!found) return;

      const variant = found.variants.find((v) => String(v.barcode) === code);

      if (variant) {
        addToCart(found, variant, 1);
        setSearch("");

        // 🔥 stable focus control
        if (!focusLock.current) {
          focusLock.current = true;
          keepFocus();

          setTimeout(() => {
            focusLock.current = false;
          }, 100);
        }
      }
    }, 180);

    return () => clearTimeout(typingTimeout.current);
  }, [search]); // 👈 🔥 ডিপেন্ডেন্সি অ্যারের সাইজ সবসময় ১ (কনস্ট্যান্ট) থাকবে, ফলে এররটি আর আসবে না।

  // ---------------- ENTER KEY ----------------
  const handleKeyDown = (e) => {
    if (e.key !== "Enter") return;

    const code = search.trim();

    const found = products?.find((product) =>
      product.variants?.some((v) => String(v.barcode) === code),
    );

    if (!found) return;

    const variant = found.variants.find((v) => String(v.barcode) === code);

    if (variant) {
      addToCart(found, variant, 1);
      setSearch("");
      keepFocus();
    }
  };

  return (
    <div className="lg:col-span-8 p-6 overflow-y-auto max-h-screen">
      {/* ---------------- SEARCH ---------------- */}
      <div className="mb-6 shadow-sm rounded-xl bg-white p-2 border border-gray-100">
        <input
          ref={inputRef} // 👈 মূল ইনপুট ফিল্ডে রেফ অ্যাসাইন করা হলো
          autoFocus
          className="w-full p-3 bg-gray-50 focus:bg-white border-0 focus:ring-2 focus:ring-green-500 rounded-lg text-gray-700 outline-none"
          placeholder="Search or Scan Barcode"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* ---------------- LOADING ---------------- */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 animate-pulse font-medium">
            Loading products...
          </p>
        </div>
      ) : products?.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {products.map((p) => (
            <div
              key={p._id}
              onClick={() => {
                // ম্যানুয়ালি মডাল ওপেন করার সময়ও ফোকাস ইনপুটে ধরে রাখা হচ্ছে
                setOpenProduct(p);
                keepFocus();
              }}
              className="group relative border border-gray-200/80 rounded-2xl p-3 cursor-pointer bg-white shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="relative h-32 w-full bg-gray-50 rounded-xl flex items-center justify-center p-2 overflow-hidden">
                <Image
                  src={p.media?.[0]?.secure_url || "/placeholder.png"}
                  width={120}
                  height={120}
                  className="object-contain transition-transform duration-300 group-hover:scale-105"
                  alt={p.name}
                  priority={false}
                />
              </div>

              <div className="mt-3">
                <h3 className="text-gray-800 font-bold text-sm line-clamp-2 min-h-[40px]">
                  {p.name}
                </h3>

                <div className="flex justify-between items-center mt-2">
                  <span className="text-xl font-black text-gray-900">
                    {Number(p.sellingPrice).toLocaleString()}৳
                  </span>

                  <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold text-gray-500">
                    {p.variants?.length || 0} Var
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <p>No products found matching your search.</p>
        </div>
      )}
    </div>
  );
}

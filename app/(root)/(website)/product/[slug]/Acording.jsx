"use client";
import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { decode } from "entities";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Plus, Minus } from "lucide-react";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

/**
 * Updated StyledTrigger:
 * Smaller min-height and padding on mobile (min-h-[44px])
 * Full size on desktop (sm:min-h-[56px])
 */
const StyledTrigger = ({ title }) => (
  <div className="flex w-full items-stretch min-h-[44px] sm:min-h-[56px] bg-[#F7F7F7] mb-1 group">
    <div className="flex-1 flex items-center px-3 sm:px-5 py-2 sm:py-3 transition-colors group-data-[state=open]:text-red-600 group-aria-expanded:text-red-600">
      <span className="text-[13px] sm:text-[15px] font-medium uppercase tracking-tight text-left">
        {title}
      </span>
    </div>
    <div className="w-10 sm:w-14 bg-[#222222] flex items-center justify-center text-white shrink-0">
      <Plus
        size={16}
        className="sm:size-[20px] group-data-[state=open]:hidden group-aria-expanded:hidden"
        strokeWidth={2.5}
      />
      <Minus
        size={16}
        className="sm:size-[20px] hidden group-data-[state=open]:block group-aria-expanded:block"
        strokeWidth={2.5}
      />
    </div>
  </div>
);

export function AccordionBasic({ product, initialVariant }) {
  const isMobile = useIsMobile();

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full max-w-lg space-y-1 sm:space-y-2"
    >
      {/* Product Description */}
      <AccordionItem value="description" className="border-none">
        {!isMobile ? (
          <Sheet modal={false}>
            <SheetTitle>
              <VisuallyHidden>Description</VisuallyHidden>
            </SheetTitle>
            <SheetTrigger asChild>
              <button className="w-full focus:outline-none group">
                <StyledTrigger title="Product Description" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[400px] sm:w-[540px] p-0 overflow-y-auto"
            >
              <div className="sticky top-0 bg-[#F7F7F7] border-b py-5 px-6 font-bold uppercase tracking-widest text-xs">
                Product Description
              </div>
              <div
                className="p-6 text-sm text-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: decode(product?.description || ""),
                }}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <AccordionTrigger className="p-0 hover:no-underline group">
              <StyledTrigger title="Product Description" />
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 bg-white border-x border-b border-gray-100 text-xs text-gray-600">
              <div
                dangerouslySetInnerHTML={{
                  __html: decode(product?.description || ""),
                }}
              />
            </AccordionContent>
          </>
        )}
      </AccordionItem>

      {/* Product Size Card */}
      <AccordionItem value="size-card" className="border-none">
        {!isMobile ? (
          <Sheet modal={false}>
            <SheetTitle>
              <VisuallyHidden>Size Card</VisuallyHidden>
            </SheetTitle>
            <SheetTrigger asChild>
              <button className="w-full focus:outline-none group">
                <StyledTrigger title="Size Chart and Description" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[400px] sm:w-[540px] p-0 overflow-y-auto"
            >
              <div className="sticky top-0 bg-[#F7F7F7] border-b py-5 px-6 font-bold uppercase tracking-widest text-xs">
                Size Guide
              </div>
              <div className="p-6 text-sm text-gray-600">
                Size chart content for PC.
              </div>
              <div className="p-6">
                {product?.sizeChart?.secure_url ? (
                  <img
                    src={product.sizeChart.secure_url}
                    alt="Size Chart"
                    className="w-full h-auto object-contain"
                  />
                ) : (
                  <p className="text-sm text-gray-500">
                    No size chart available
                  </p>
                )}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <AccordionTrigger className="p-0 hover:no-underline group">
              <StyledTrigger title="Size Chart and Description" />
            </AccordionTrigger>
            <AccordionContent className="px-4 py-3 bg-white border-x border-b border-gray-100">
              {product?.sizeChart?.secure_url ? (
                <img
                  src={product.sizeChart.secure_url}
                  alt="Size Chart"
                  className="w-full h-auto object-contain"
                />
              ) : (
                <p className="text-sm text-gray-500">No size chart available</p>
              )}
            </AccordionContent>
          </>
        )}
      </AccordionItem>

      {/* Return Policy */}
      <AccordionItem value="returns" className="border-none">
        <AccordionTrigger className="p-0 hover:no-underline group">
          <StyledTrigger title="Return Policy" />
        </AccordionTrigger>
        <AccordionContent className="px-4 py-3 bg-white border-x border-b border-gray-100  text-black">
          Returns are accepted within 7 days.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

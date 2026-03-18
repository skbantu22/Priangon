"use client"
import { useState, useEffect } from "react"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return isMobile
}
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { decode } from "entities"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"


export function AccordionBasic({ product, initialVariant }) {
  const isMobile = useIsMobile()


  return (
    <Accordion type="single" collapsible className="max-w-lg">
      {/* Product Code */}
      <div className="flex justify-between items-center py-4 border-b text-sm">
        <span className="font-medium text-gray-700">Product Code</span>
        <span className="text-gray-900 font-medium">{initialVariant?.sku || "N/A"}</span>
      </div>

      {/* Product Description */}
      {isMobile ? (

         <AccordionItem value="descriptionDesktop">
          <AccordionTrigger>Product Description</AccordionTrigger>
          <AccordionContent>
            <div
              className="text-sm text-gray-600 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: decode(product?.description || "No description available."),
              }}
            />
          </AccordionContent>
        </AccordionItem>
        // Mobile: Sheet
        
      ) : (
        // Desktop: normal accordion
       
<AccordionItem value="descriptionMobile">
          <Sheet>
            <SheetTitle>
              <VisuallyHidden>Product Description</VisuallyHidden>


            </SheetTitle>
            <SheetTrigger asChild>
              <AccordionTrigger>Product Description</AccordionTrigger>
            </SheetTrigger>
            <SheetContent 
  className=" w-full rounded-t-xl overflow-y-auto" >
              <div
                className="text-sm text-gray-600 leading-relaxed p-4 "
                dangerouslySetInnerHTML={{
                  __html: decode(product?.description || "No description available."),
                }}
              />
            </SheetContent>
          </Sheet>
        </AccordionItem>















      )}

      {/* Return Policy */}
      <AccordionItem value="returns">
        <AccordionTrigger>Return Policy</AccordionTrigger>
        <AccordionContent>
          Returns are accepted within 7 days if the product is unused and in original packaging.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
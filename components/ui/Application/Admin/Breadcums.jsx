import React from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function Breadcums({ items, className }) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink href={item.href} className="text-[8px] md:text-sm font-medium hover:text-gray-700 ">
                  {item.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-[8px] md:text-sm font-medium hover:text-gray-700 ">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>

            {index < items.length - 1 && (
              <BreadcrumbSeparator />
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const BreadCrumb = ({ breadcrumbData = [] }) => {
  return (
    <Breadcrumb className="mb-5">
      <BreadcrumbList>
        {breadcrumbData.map((data, index) => {
          const isLast = index === breadcrumbData.length - 1;

          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{data.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={data.href}>
                    {data.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>

              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default BreadCrumb;

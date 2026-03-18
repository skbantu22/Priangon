"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import dayjs from "dayjs";

// UI Components
import BreadCrumb from "@/components/ui/Application/Admin/Breadcrubm";
import { 
  Form, 
  FormField, 
  FormLabel, 
  FormItem, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";

// Utilities & Config
import { 
  ADMIN_CATEGORY_EDIT, 
  ADMIN_CATEGORY_SHOW, 
  ADMIN_COUPON_EDIT, 
  ADMIN_COUPON_SHOW, 
  ADMIN_DASHBOARD 
} from "@/Route/Adminpannelroute";
import { zSchema } from "@/lib/zodschema";
import { showToast } from "@/lib/showToast";
import useFetch from "@/hooks/useFetch";
import { use } from "react";
import { useRouter } from "next/navigation";




const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
  { href: ADMIN_COUPON_SHOW, label: "Coupon" },
  { href: ADMIN_COUPON_EDIT, label: "Edit Coupon" },
];

const EditCoupon = ({params}) => {
  const {id}=use(params)
  const router = useRouter();
  const [loading, setLoading] = useState(false);
console.log("ID:", id);


const { data: getCouponData } = useFetch(`/api/coupon/get/${id}`)



  // 1. Setup Form Schema
  const formSchema = zSchema.pick({
_id: true,
     code: true,
    discountPercentage: true,
minShoppingAmount: true,
validity: true,
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
   
     code: "",
    discountPercentage: "",
    minShoppingAmount: "",
    validity: "",
    },
  });

 
 useEffect(() => {
  if (getCouponData && getCouponData.success) {
    const coupon = getCouponData.data;
    console.log(coupon)
    form.reset({
       _id: coupon._id || id,
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
      minShoppingAmount: coupon.minShoppingAmount,
      validity: dayjs(coupon.validity).format("YYYY-MM-DD"),
    });
  }
}, [getCouponData, form, id]);
  

  const onSubmit = async (values) => {
  setLoading(true)
  try {

    const { data: response } = await axios.put('/api/coupon/update', values)
    if (!response.success) {
      throw new Error(response.message)
    }

    form.reset()
    showToast('success', response.message)
    router.push(ADMIN_COUPON_SHOW)

  } catch (error) {
    showToast('error', error.message)
  } finally {
    setLoading(false)
  }
}

  const onInvalid = (errors) => {
    console.error("Validation Failed:", errors);
    showToast("error", "Please check required fields.");
  };

  return (
    <div className="space-y-6">
      <BreadCrumb breadcrumbData={breadcrumbData} />

      <Card className="shadow-sm border-none">
        <CardHeader className="border-b bg-gray-50/30">
          <h1 className="text-2xl font-bold text-center">Edit Coupon</h1>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="grid md:grid-cols-2 grid-cols-1 gap-6">
              
              
              

         
               <div>
{/* Code */}
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter Code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               </div>

           

              

              
               <div>
<FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount %</FormLabel>
                      <Input type="number" placeholder="Enter discountPercentage"  {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

               </div>
               
                
          
          <div>
 <FormField
                  control={form.control}
                  name="minShoppingAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Shopping Amount</FormLabel>
                      <Input type="number" placeholder="Min Shopping Amount"  {...field} />
                      <FormMessage />
                    </FormItem>
                  )}
                />

          </div>

               
             
<div className="">
  <FormField
    control={form.control}
    name="validity"
    render={({ field }) => (
      <FormItem>
        <FormLabel>
          Validity <span className="text-red-500">*</span>
        </FormLabel>
        <FormControl>
          <Input type="date" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
              
             
              
               

              {/* Submit Button */}
              <div className="md:col-span-2 pt-4">
                <ButtonLoading 
                  type="submit" 
                  loading={loading} 
                  text="Save Changes" 
                  className="w-full h-12"
                />
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>

     
    </div>
  );
};

export default EditCoupon;

"use client"

import BreadCrumb from '@/components/ui/Application/Admin/Breadcrubm';
import { ADMIN_CATEGORY_EDIT, ADMIN_CATEGORY_SHOW, ADMIN_DASHBOARD } from '@/Route/Adminpannelroute';
import React, { useEffect, useState } from 'react'
import { Form } from "@/components/ui/form"
import { useForm } from "react-hook-form"

import { FormField,FormLabel,FormItem ,FormControl,FormMessage} from "@/components/ui/form"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import ButtonLoading from '@/components/ui/Application/ButtonLoading';
import { zSchema } from '@/lib/zodschema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from "@/components/ui/input";
import { showToast } from '@/lib/showToast';
import slugify from 'slugify';
import axios from 'axios';


const breadcrumbData = [
  { href: ADMIN_DASHBOARD, label: "Home" },
{ href: ADMIN_CATEGORY_SHOW, label: "category" },
{ href: ADMIN_CATEGORY_EDIT, label: "Add category" },
];
const AddCategory = () => {
const formSchema = zSchema.pick({
  name: true,
  slug: true,
})
 const [loading,setloading]=useState(false)


const form = useForm({
  resolver: zodResolver(formSchema),
  defaultValues: {
    name: "",
    slug: "",
  },
})
useEffect(() => {
  const name = form.getValues('name')
  if (name) {
    form.setValue('slug', slugify(name).toLowerCase())
  }
}, [form.watch('name')])



const onSubmit = async (values) => {
  setloading(true)
  try {
    const { data: response } = await axios.post('/api/category/create', values)

    if (!response.success) {
      throw new Error(response.message)
    }

    showToast('success', response.message)
  } catch (error) {
    showToast('error', error.message)
  } finally {
    setloading(false)
  }
}

   
  return (
    <div>

        <BreadCrumb breadcrumbData={breadcrumbData} /> 

        <Card className="p-0 rounded shadow-sm">
                <CardHeader>
                    <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Add Category</h1>
            
          </div>
        
        
        
                </CardHeader>
        
                <CardContent className="pb-5">
                    <div className="mb-5">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} >
                        <div>
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input type="text" placeholder="Entire Category Name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      </div>
                            <div className="mb-5">
                                         <FormField
                                           control={form.control}
                                           name="slug"
                                           render={({ field }) => (
                                             <FormItem>
                                               <FormLabel>Slug</FormLabel>
                                               <FormControl>
                                                 <Input placeholder="m@example.com" {...field} />
                                               </FormControl>
                                               <FormMessage />
                                             </FormItem>
                                           )}
                                         />
                                        </div>
                     
        
                    
                        
                       <div className='mb-3'>

                     <ButtonLoading type="submit"
                        className=""
                         loading={loading}
                     text=  "Submit"  />
                       </div>
                      
        
                     
                    </form>
                  </Form>
                  </div>
                </CardContent>
              </Card>
      
    </div>
  )
}

export default AddCategory

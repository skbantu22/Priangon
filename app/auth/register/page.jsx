
"use client"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
// import { zSchema } from "@/lib/zodschema"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form } from "@/components/ui/form"
import { FormField,FormLabel,FormItem ,FormControl,FormMessage} from "@/components/ui/form"
import z from "zod"
import ButtonLoading from "@/components/ui/Application/ButtonLoading"
import { set } from "zod/v3"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { WEBSITE_LOGIN, WEBSITE_REGISTER } from "@/Route/Websiteroute"
import axios from "axios"
import { zSchema } from "@/lib/zodschema"

export const formSchema = zSchema
  .pick({
    name: true,
    email: true,
    password: true,
  })
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password and confirm password must be same.',
    path: ['confirmPassword'],
  });



export default function Register() {
    const [loading,setloading]=useState(false)
    const [isTypePassword,setisTypepassword]=useState(true)
    const [isTypeconfirmPassword,setisTypeconfirmPassword]=useState(true)
const form = useForm({
  resolver: zodResolver(formSchema),
  
  defaultValues :{
  name : "",
   email : "",
   password : "" ,
   confirmPassword : "",
  }
})

    const handleRegisterSubmit = async (values) => {
        
  try {

 setloading(true)
    const res = await axios.post("/api/auth/register", values)
    const registerResponse = res.data

    if (!registerResponse.success) {
      throw new Error(registerResponse.message)
    }

    form.reset()
    alert(registerResponse.message)
    


  } catch (error) {
const msg =
      error?.response?.data?.message || error?.message || "Something went wrong"
    alert(msg)
  }
  finally {
    setloading(false)
  }
}

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 ">
      <Card className="w-full max-w-sm">
        <CardHeader>
            <div className="text-center space-y-2">
    <h1 className="text-3xl font-bold">Create Account</h1>
    <p className="text-muted-foreground">
      Create new account by filling out the form below.
    </p>
  </div>



        </CardHeader>

        <CardContent>
            <div className="mb-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleRegisterSubmit)} className="space-y-2">
                <div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Prianka" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
                    <div className="mb-5">
                                 <FormField
                                   control={form.control}
                                   name="email"
                                   render={({ field }) => (
                                     <FormItem>
                                       <FormLabel>Email</FormLabel>
                                       <FormControl>
                                         <Input placeholder="m@example.com" {...field} />
                                       </FormControl>
                                       <FormMessage />
                                     </FormItem>
                                   )}
                                 />
                                </div>
              <div className="mb-5">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type={isTypePassword? 'password' : 'text' } placeholder="********" {...field} />
                     
                    </FormControl>
                     <button  className="absolute top-1/2 right-2 cursor-pointer" 
                     onClick={() => setisTypepassword(!isTypePassword)} type="button" >
                        {isTypePassword ? <Eye  size={18} /> : <EyeOff size={18} />}
                      </button>
                    
                    <FormMessage />
                  </FormItem>
                )}
              />
             
              
                </div>

             <div className="mb-5">
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type={isTypeconfirmPassword? 'password' : 'text' } placeholder="********" {...field} />
                     
                    </FormControl>
                    
                    
                     <button  className="absolute top-1/2 right-2 cursor-pointer" 
                     onClick={() => setisTypeconfirmPassword(!isTypeconfirmPassword)} type="button" >
                        {isTypeconfirmPassword ? <Eye  size={18} /> : <EyeOff size={18} />}
                      </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
             
              
                </div>
              
                
              
              <ButtonLoading type="submit"
                className="w-full"
                 loading={loading}
             text=  "Create Account"  />

             <div className="text-center">
                <div className="flex gap-1 justify-center">

                    <p>Already Have account?</p>
                       <Link href={WEBSITE_LOGIN} className="text-primary underline">login</Link>
                </div>
                



             </div>
            </form>
          </Form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

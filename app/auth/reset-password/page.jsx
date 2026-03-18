"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { FormField, FormLabel, FormItem, FormControl, FormMessage } from "@/components/ui/form";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { WEBSITE_LOGIN, WEBSITE_REGISTER } from "@/Route/Websiteroute";
import { zSchema } from "@/lib/zodschema";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { login } from "@/store/reducer/authReducer";
import UpdatePassword from "@/components/ui/Application/UpdatePassword";
import { showToast } from "@/lib/showToast";
import OTPVerification from "@/components/ui/Application/OTPverification";

export const formSchema = zSchema
  .pick({ email: true })
  .extend({
    password: zSchema.shape?.password ?? undefined, // if your zSchema already has password rules
  })
  .superRefine((val, ctx) => {
    if (!val.password || val.password.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "Password field is required.",
      });
    }
  });

export default function ResetPassword() {
const [emailVerificationLoading, setEmailVerificationLoading] = useState(false);

  const [otpVerificationLoading, setOtpVerificationLoading] = useState(false)
  const [loading, setloading] = useState(false);
  const [isTypePassword, setisTypepassword] = useState(true);
  const [otpEmail, setOtpEmail] = useState()
  const [isOtpVerified, setIsOtpVerified] = useState(false)
 
    const formSchema = zSchema.pick({
  email: true
})

const form = useForm({
  resolver: zodResolver(formSchema),
  defaultValues: {
    email: ""
  }
})

const handleEmailVerification = async (values) => {

 try {
    setEmailVerificationLoading(true)
    const { data: sendotpResponse } = await axios.post('/api/auth/reset-password/send-otp', values)
    if (!sendotpResponse.success) {
      throw new Error(sendotpResponse.message)
    }
    setOtpEmail(values.email)
    showToast('success', sendotpResponse.message)

   
  } catch (error) {  
    showToast('error', error.message)
  } finally {
    setOtpVerificationLoading(false)
  }




 }
  

const handleOtpVerification = async (values) => {
  try {
    setOtpVerificationLoading(true)
    const { data: otpResponse } = await axios.post('/api/auth/reset-password/verify-otp', values)
    if (!otpResponse.success) {
      throw new Error(otpResponse.message)
    }
   
    showToast('success', otpResponse.message)

   setIsOtpVerified(true)
  } catch (error) {
    showToast('error', error.message) 
  } finally {
    setOtpVerificationLoading(false)
  }
}
    
  return (
    <div className="p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Reset your password</h1>
              <p className="text-sm text-gray-600 mt-1">
          Enter your email for password rest.
        </p>
          </div>
        </CardHeader>

        <CardContent>
                       {!otpEmail 
  ? 
  <>   <div>
              <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleEmailVerification)}
              className="space-y-2"
            >
            
              <div className="mb-5">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="m@example.com" {...field} className="pr-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

             

              <ButtonLoading
                type="submit"
                className="w-full"
                text="Send OTP"
                loading={emailVerificationLoading}
                
              />

              <div className="text-center">
                <div className="flex gap-2 items-center justify-center">
                 
                  <Link href={WEBSITE_LOGIN} className="text-primary underline">
                   Back To login
                  </Link>
                </div>
                <div>
                  
                </div>
              </div>
            </form>
          </Form>
    
  </div>
  
  </> 
  : 
  
<>
  {!isOtpVerified 
    ? 
   
    <OTPVerification email={otpEmail} onSubmit={handleOtpVerification} 
    loading={otpVerificationLoading} /> 
    
    : 
    
    <UpdatePassword email={otpEmail} />
  }
</>




}


        
        </CardContent>
      </Card>
    </div>
  );
}

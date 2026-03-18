import { zSchema } from "@/lib/zodschema"
import { zodResolver } from "@hookform/resolvers/zod"
import React, { useState } from 'react'
import axios from "axios";
import { showToast } from "@/lib/showToast";

import { 
  Form, 
  FormField, 
  FormLabel, 
  FormItem, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import ButtonLoading from "./ButtonLoading";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../input-otp";
const OTPVerification = ({ email, onSubmit, loading }) => {

    const [isResendingOtp, setIsResendingOtp] = useState(false)

  const formSchema = zSchema.pick({
    otp: true, email: true
  })
                
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      otp: "",
      email: email
    }
  })

  const handleOtpVerification = async (values) => {
  onSubmit(values)
}

  const resendOTP = async () => {
  try {
    setIsResendingOtp(true);

    const { data } = await axios.post(
      "/api/auth/reset-password/send-otp",
      { email }
    );

    if (!data?.success) throw new Error(data?.message);

    form.reset({ otp: "", email });
    showToast("success", data.message);
  } catch (error) {
    showToast("error", error?.message);
  } finally {
    setIsResendingOtp(false);
  }
};


  return (
    <div>
        
   <Form {...form}>
               <form onSubmit={form.handleSubmit(handleOtpVerification)} className="space-y-4">
                 
                 <FormField
                   control={form.control}
                   name="otp"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                         OTP
                       </FormLabel>
                       <FormControl>
                        <InputOTP maxLength={6} 
                        
                          value={field.value ?? ""}
                        onChange={field.onChange}
                        
                        
                        >
      <InputOTPGroup>
        <InputOTPSlot index={0} />
        <InputOTPSlot index={1} />
        <InputOTPSlot index={2} />
        <InputOTPSlot index={3} />
        <InputOTPSlot index={4} />
        <InputOTPSlot index={5} />
      </InputOTPGroup>
    </InputOTP>
                       </FormControl>
                       <FormMessage className="text-[11px]" />
                     </FormItem>
                   )}
                 />
   
                
                 <div className='mb-3'>
  <ButtonLoading
    loading={loading} 
    type="submit" 
    text="Verify" 
    className="w-full cursor-pointer" 
  />
  <div className='text-center mt-5'>
    <button
  type="button"
  onClick={resendOTP}
  disabled={isResendingOtp}
  className="text-blue-500 cursor-pointer hover:underline disabled:opacity-60"
>
  {isResendingOtp ? "Resending..." : "Resend OTP"}
</button>

  </div>
</div>
   
                 
               </form>
             </Form>




    </div>
  )
}

export default OTPVerification

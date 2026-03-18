"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

// UI Components - Ensure these paths match your project structure
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Form, 
  FormField, 
  FormLabel, 
  FormItem, 
  FormControl, 
  FormMessage 
} from "@/components/ui/form";
import ButtonLoading from "@/components/ui/Application/ButtonLoading";

// Utils & State
import { WEBSITE_REGISTER, WEBSITE_USER_DASHBOARD } from "@/Route/Websiteroute";
import { zSchema } from "@/lib/zodschema";
import { login } from "@/store/reducer/authReducer";
import { showToast } from "@/lib/showToast";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

// Validation Schema
export const formSchema = zSchema
  .pick({ email: true })
  .extend({
    password: zSchema.shape?.password ?? undefined,
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

export default function Login() {
  const dispatch = useDispatch();
  const searchParams= useSearchParams()
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isTypePassword, setisTypepassword] = useState(true);
  const [serverMsg, setServerMsg] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLoginSubmit = async (values) => {
    try {
      setLoading(true);
      const { data: registerResponse } = await axios.post('/api/auth/login', values);

      if (!registerResponse.success) {
        throw new Error(registerResponse.message);
      }
      
      dispatch(login(registerResponse));
if (searchParams.has('callback')) {
  router.push(searchParams.get('callback'))
} else {
  registerResponse.data.role === 'admin'
    ? router.push(ADMIN_DASHBOARD)
    : router.push(WEBSITE_USER_DASHBOARD)
}




      form.reset();
      showToast('success', registerResponse.message);
      // router.push("/dashboard"); 

    } catch (error) {
      showToast('error', error.message);
      setServerMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
<div className=" w-full flex items-start justify-center bg-slate-50/50 p-4 ">
      <Card className="w-full max-w-[400px] shadow-lg border-slate-200">
        <CardHeader className="pt-8 pb-4">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </div>
        </CardHeader>

        <CardContent className="pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLoginSubmit)} className="space-y-4">
              {serverMsg && (
                <div className="bg-destructive/10 p-3 rounded-md border border-destructive/20">
                  <p className="text-center text-xs font-medium text-destructive">{serverMsg}</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="name@company.com" 
                        {...field} 
                        className="h-11 focus-visible:ring-primary/20" 
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                      Password
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={isTypePassword ? "password" : "text"}
                          placeholder="••••••••"
                          {...field}
                          className="h-11 pr-10 focus-visible:ring-primary/20"
                        />
                      </FormControl>
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 transition-colors"
                        onClick={() => setisTypepassword(!isTypePassword)}
                        type="button"
                      >
                        {isTypePassword ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                    </div>
                    <FormMessage className="text-[11px]" />
                    <div className="flex justify-end">
                      <Link href="/auth/reset-password" name="password" className="text-xs font-medium text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                  </FormItem>
                )}
              />

              <ButtonLoading
                type="submit"
                className="w-full h-11 text-sm font-semibold transition-all hover:opacity-90"
                loading={loading}
                text="Sign In"
              />

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">New here?</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link href={WEBSITE_REGISTER} className="font-semibold text-primary hover:underline">
                    Create Account
                  </Link>
                </p>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
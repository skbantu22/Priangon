"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import {
  Eye,
  EyeOff,
  Gift,
  Loader2,
  MessageCircle, 
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zSchema } from "@/lib/zodschema";
import { login } from "@/store/reducer/authReducer";
import { showToast } from "@/lib/showToast";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import logoWide from "@/public/assets/sbt-logo-wide.png";

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

const inputClass =
  "h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[15px] text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-[#5b2ee0] focus:ring-4 focus:ring-[#5b2ee0]/15";

const FEATURES = [
  { icon: Store, text: "POS, stock and dealer sales in one place" },
  { icon: Smartphone, text: "IMEI tracking for every phone sold" },
  { icon: ShieldCheck, text: "Warranty claims and customer dues" },
];

function ReferralCard() {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-[#f0e7ff] bg-[#f9f5ff] shadow-sm">
      <div className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5b2ee0] text-white shadow-md shadow-[#5b2ee0]/25">
          <Gift className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#5b2ee0]">
            referral program
          </p>
          <h3 className="mt-1 text-base font-bold text-[#1f1738]">
            AmarSolution রেফার করুন, ৫,০০০ টাকা পর্যন্ত বোনাস জিতুন।
          </h3>
        </div>
      </div>
      <div className="border-t border-[#eadfff] px-4 py-3 text-right">
        <Link href="https://app.amarsolution.net/referral-program" className="inline-flex items-center justify-center text-sm font-semibold text-[#5b2ee0] hover:underline">
          বিস্তারিত জানতে ক্লিক করুন
        </Link>
      </div>
    </div>
  );
}

export default function Login() {
  const dispatch = useDispatch();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [serverMsg, setServerMsg] = useState("");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleLoginSubmit = async (values) => {
    try {
      setLoading(true);
      setServerMsg("");
      const { data: res } = await axios.post("/api/auth/login", { ...values, remember });

      if (!res.success) throw new Error(res.message);

      dispatch(login(res));
      if (searchParams.has("callback")) {
        router.push(searchParams.get("callback"));
      } else {
        const role = res.data?.role || res.data?.user?.role;
        router.push(
          role === "admin"
            ? ADMIN_DASHBOARD
            : ["dealer", "subDealer", "wholesaler"].includes(role)
              ? "/partner"
              : "/admin/pos",
        );
      }

      form.reset();
      showToast("success", res.message);
    } catch (error) {
      const message = error?.response?.data?.message || error.message;
      showToast("error", message);
      setServerMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] px-4 py-8 text-[#1c1c1c] lg:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[30px] bg-white shadow-[0_20px_65px_rgba(38,26,70,0.08)] ring-1 ring-[#ece8f8]">
          <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
            <aside className="hidden bg-[radial-gradient(circle_at_top_left,_rgba(123,63,228,0.18),_transparent_36%),linear-gradient(135deg,_#f5f1ff_0%,_#f9fbff_45%,_#eff3ff_100%)] p-10 lg:flex lg:flex-col lg:justify-center">
              <div className="w-[min(400px,82%)] rounded-[26px] bg-white p-5 shadow-xl shadow-[#5b2ee0]/10 ring-1 ring-[#ece4ff]">
                <Image src={logoWide} alt="SB Telecom" priority className="h-auto w-full" />
              </div>

              <div className="mt-10 max-w-md">
                <h2 className="text-3xl font-bold leading-tight text-[#1d1745] xl:text-[2.2rem]">
                  Run your whole telecom business from one screen
                </h2>
                <ul className="mt-8 space-y-4">
                  {FEATURES.map(({ icon: Icon, text }) => (
                    <li key={text} className="flex items-center gap-3 text-[15px] text-[#433b5f]">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5b2ee0]/10 text-[#5b2ee0]">
                        <Icon className="h-5 w-5" />
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <main className="flex items-center justify-center p-6 sm:p-8 lg:p-10">
              <div className="w-full max-w-[440px]">
                <div className="mb-8 text-center">
                  <div className="mx-auto flex w-[220px] justify-center rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#efe7ff] lg:hidden">
                    <Image src={logoWide} alt="SB Telecom" priority className="h-auto w-full" />
                  </div>
                  <h1 className="mt-6 text-3xl font-bold text-[#1a1532]">Continue to AmarSolution</h1>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleLoginSubmit)} className="space-y-5">
                    {serverMsg && (
                      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">
                        {serverMsg}
                      </p>
                    )}

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#433b5f]">Email or Username</FormLabel>
                          <FormControl>
                            <input
                              type="text"
                              autoComplete="username"
                              placeholder="Username or Email"
                              className={inputClass}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-[#433b5f]">Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <input
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Password"
                                className={`${inputClass} pr-12`}
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-gray-500 hover:text-gray-800"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                            </button>
                          </div>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between gap-3 text-sm text-[#433b5f]">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-4 w-4 rounded border-[#d9d2ee] accent-[#5b2ee0]"
                        />
                        Remember Me
                      </label>
                      <Link href="/auth/reset-password" className="font-medium text-[#5b2ee0] hover:underline">
                        Forgot Password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#5b2ee0] text-[15px] font-semibold text-white shadow-lg shadow-[#5b2ee0]/25 transition hover:bg-[#4d29d4] disabled:opacity-70"
                    >
                      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      {loading ? "Signing in..." : "Log in"}
                    </button>
                  </form>
                </Form>

                <ReferralCard />
              </div>
            </main>
          </div>
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-20 flex items-center gap-3 rounded-full border border-[#e7e0fb] bg-white px-4 py-3 shadow-lg shadow-[#5b2ee0]/10">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#26213c]">
          <MessageCircle className="h-4 w-4 text-[#5b2ee0]" />
          <span>সাপোর্ট এর জন্যে</span>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-[#5b2ee0]">
          <PhoneCall className="h-4 w-4" />
          <span>Call/Whatsapp করুন 👉</span>
        </div>
      </div>
    </div>
  );
}

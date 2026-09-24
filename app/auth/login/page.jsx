"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, Loader2, ShieldCheck, Smartphone, Store } from "lucide-react";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zSchema } from "@/lib/zodschema";
import { login } from "@/store/reducer/authReducer";
import { showToast } from "@/lib/showToast";
import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";
import logoWide from "@/public/assets/sbt-logo-wide.png";

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

const inputClass =
  "h-12 w-full rounded-xl border border-gray-300 bg-white px-4 text-[15px] text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-[#5b2ee0] focus:ring-4 focus:ring-[#5b2ee0]/15 dark:border-white/20 dark:bg-white/5 dark:text-white";

const FEATURES = [
  { icon: Store, text: "POS, stock and dealer sales in one place" },
  { icon: Smartphone, text: "IMEI tracking for every phone sold" },
  { icon: ShieldCheck, text: "Warranty claims and customer dues" },
];

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
    <div className="flex min-h-screen w-full bg-[#eef3f7] dark:bg-[#0f0b1f]">
      {/* ================= BRAND PANEL (desktop) ================= */}
      <aside className="relative hidden w-[52%] overflow-hidden lg:block">
        {/* curved edge, like a wave into the form side */}
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#24135f" />
              <stop offset="55%" stopColor="#3b1fb0" />
              <stop offset="100%" stopColor="#5b2ee0" />
            </linearGradient>
          </defs>
          <path d="M0,0 H46 C72,6 92,40 94,62 C96,80 92,92 90,100 H0 Z" fill="url(#brand)" />
        </svg>

        {/* soft circuit lines, echoing the logo */}
        <svg className="absolute inset-0 size-full opacity-[0.12]" aria-hidden="true">
          <defs>
            <pattern id="circuit" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M0 30h40l15 15h65M0 90h25l20-20h75M60 0v20l15 15v85" stroke="#fff" strokeWidth="1.2" fill="none" />
              <circle cx="40" cy="30" r="2.5" fill="#fff" />
              <circle cx="45" cy="70" r="2.5" fill="#fff" />
              <circle cx="75" cy="35" r="2.5" fill="#fff" />
            </pattern>
          </defs>
          <rect width="85%" height="100%" fill="url(#circuit)" />
        </svg>

        <div className="relative z-10 flex h-full flex-col justify-center px-14 xl:px-20">
          <div className="w-[min(420px,80%)] rounded-3xl bg-white p-6 shadow-2xl shadow-black/30">
            <Image src={logoWide} alt="SB Telecom" priority className="h-auto w-full" />
          </div>

          <h2 className="mt-10 max-w-md text-3xl font-bold leading-tight text-white xl:text-4xl">
            Run your whole telecom business from one screen
          </h2>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-white/90">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Icon className="size-5 text-white" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ================= FORM ================= */}
      <main className="flex min-h-screen flex-1 flex-col">
        {/* phones / tablets: brand header instead of the side panel */}
        <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-[#24135f] via-[#3b1fb0] to-[#5b2ee0] px-6 pb-16 pt-10 lg:hidden">
          <div className="mx-auto w-full max-w-[260px] rounded-2xl bg-white p-3 shadow-xl shadow-black/30">
            <Image src={logoWide} alt="SB Telecom" priority className="h-auto w-full" />
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center px-5 lg:items-center lg:px-10">
          <div className="relative z-10 -mt-10 w-full max-w-[460px] rounded-3xl bg-white p-6 shadow-xl shadow-[#24135f]/10 sm:p-8 lg:mt-0 lg:bg-transparent lg:p-0 lg:shadow-none dark:bg-[#17112e] lg:dark:bg-transparent">
            <div className="mb-8 text-center">
              <Image
                src={logoWide}
                alt=""
                className="mx-auto hidden h-20 w-auto lg:block"
                priority
              />
              <h1 className="mt-3 text-2xl font-bold text-[#1d1745] sm:text-[28px] dark:text-white">
                Continue to SB Telecom
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                Sign in with your staff or dealer account
              </p>
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
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</FormLabel>
                      <FormControl>
                        <input
                          type="email"
                          autoComplete="username"
                          placeholder="name@company.com"
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
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
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

                <div className="flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 select-none dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="size-[18px] rounded accent-[#5b2ee0]"
                    />
                    Remember me
                  </label>
                  <Link
                    href="/auth/reset-password"
                    className="text-sm font-medium text-[#5b2ee0] hover:underline dark:text-[#a78bfa]"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#5b2ee0] via-[#7b3fe4] to-[#d946ef] text-[15px] font-semibold text-white shadow-lg shadow-[#5b2ee0]/30 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-70"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loading ? "Signing in..." : "Log in"}
                </button>
              </form>
            </Form>

            <p className="mt-10 text-center text-xs text-gray-400">
              © {new Date().getFullYear()} SB Telecom · Global Connectivity Solutions
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

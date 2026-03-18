"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const { token } = useParams();
  const router = useRouter();

  const [status, setStatus] = useState("Verifying...");

  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const res = await axios.get(`/api/auth/verify-email/${token}`);

        if (res.data?.success) {
          setStatus("Email verified successfully ✅");
          setTimeout(() => router.push("/auth/login"), 2000);
        } else {
          setStatus(res.data?.message || "Verification failed");
        }
      } catch (error) {
        setStatus(
          error?.response?.data?.message || "Invalid or expired link"
        );
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-lg font-semibold">{status}</p>
    </div>
  );
}

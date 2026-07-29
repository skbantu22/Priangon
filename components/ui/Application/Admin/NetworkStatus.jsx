"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function NetworkStatus() {
  const isOnline = useNetworkStatus();

  const [show, setShow] = useState(false);
  const [status, setStatus] = useState(null);
  const [animationKey, setAnimationKey] = useState(0);

  // Offline / Online detect
  useEffect(() => {
    if (!isOnline) {
      setStatus("offline");
      setShow(true);
    } else {
      if (status === "offline") {
        setStatus("online");
        setShow(true);

        const timer = setTimeout(() => {
          setShow(false);
        }, 2500);

        return () => clearTimeout(timer);
      }
    }
  }, [isOnline]);

  // Offline হলে প্রতি 1 sec animation restart
  useEffect(() => {
    if (!isOnline) {
      const interval = setInterval(() => {
        setAnimationKey((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isOnline]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={animationKey}
          initial={{
            y: -100,
            opacity: 0,
            scale: 0.8,
          }}
          animate={{
            y: 20,
            opacity: 1,
            scale: 1,

            x: status === "offline" ? [0, -10, 10, -10, 10, 0] : 0,
          }}
          exit={{
            y: -100,
            opacity: 0,
            scale: 0.8,
          }}
          transition={{
            duration: 0.4,
          }}
          className="
            fixed
            top-0
            left-1/2
            -translate-x-1/2
            z-[999999]
            "
        >
          <div
            className={`
              flex
              items-center
              gap-5
              px-10
              py-6
              rounded-2xl
              shadow-2xl
              text-white

              ${
                status === "online"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                  : "bg-gradient-to-r from-red-500 to-pink-600"
              }

              `}
          >
            {status === "online" ? (
              <Wifi size={55} className="animate-pulse" />
            ) : (
              <WifiOff size={55} />
            )}

            <div>
              <h2 className="text-3xl font-bold">
                {status === "online" ? "You are Online" : "You are Offline"}
              </h2>

              <p className="text-lg opacity-90">
                {status === "online"
                  ? "Internet connection restored"
                  : "Please check your internet connection"}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

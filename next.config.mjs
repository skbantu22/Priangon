import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // VPS e /root/package-lock.json thakle Next wrong root dhore nite pare; ei app folder lock kore dewa.
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    // One build worker instead of one per CPU. "Collecting page data" loads
    // every route in each worker, and with this many routes a small VPS runs
    // out of RAM and the build hangs there. One worker keeps it within memory.
    cpus: 1,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
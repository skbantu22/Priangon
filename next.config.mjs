/** @type {import('next').NextConfig} */
const nextConfig = {
 images: {
      domains: ["via.placeholder.com"], // ✅ here

    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
        search :'',
        
      },
    ],
  },




};

export default nextConfig;

import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development", // ডেভেলপমেন্ট মোডে ক্যাশ ঝামেলা এড়াতে
});

const nextConfig: NextConfig = {
  webpack: (config) => {
    // pdfjs-dist-এর Node.js canvas মডিউলকে ব্রাউজার বিল্ডে ফলব্যাক করে দেওয়া
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default withSerwist(nextConfig);

import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@dailyforge/db", "@dailyforge/core", "@dailyforge/shared"],
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "@prisma/client-runtime-utils",
    "pg",
  ],
  turbopack: {
    root: path.resolve(__dirname, "../../"),
  },
};

export default nextConfig;

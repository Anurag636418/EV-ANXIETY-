import type { NextConfig } from "next";
import { dirname } from "path";
import { fileURLToPath } from "url";

const appDirectory = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: appDirectory,
};

export default nextConfig;

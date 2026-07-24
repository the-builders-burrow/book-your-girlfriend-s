import type { NextConfig } from "next";
import { wrapNextjsConfigWithBraintrust } from "braintrust/next";

if (!process.env.BRAINTRUST_API_KEY) {
  try {
    process.loadEnvFile(".env.braintrust");
  } catch {
    // Hosted environments provide BRAINTRUST_API_KEY directly.
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default wrapNextjsConfigWithBraintrust(nextConfig);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Old single-event URLs → event picker
  async redirects() {
    return ["/control", "/pitch", "/waiting"].map((source) => ({
      source,
      destination: "/",
      permanent: false,
    }));
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Stage videos/posters never change for a given filename: let the browser
  // keep them (and the video's byte ranges) instead of re-downloading on reload.
  async headers() {
    return [
      {
        source: "/stage/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

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

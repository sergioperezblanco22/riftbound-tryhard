import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La aplicacion es totalmente dinamica y dependiente de la sesion del usuario
  // (cookies + RLS), por lo que Cache Components no aporta valor aqui.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

import { defineConfig, sessionDrivers } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import vercel from "@astrojs/vercel";

/** Vercel sets `VERCEL=1` during CI/build and runtime — use the serverless adapter so `/api/*` is deployed. */
const onVercel = process.env.VERCEL === "1";

export default defineConfig({
  ...(onVercel ? { output: "server" } : {}),
  adapter: onVercel ? vercel() : node({ mode: "standalone" }),
  integrations: [react()],
  // In-memory driver avoids @astrojs/node’s default fs session base living under the project path.
  // A folder name like `Aaron's wedding` contains `'` and breaks Vite’s generated session-driver import string.
  session: {
    driver: sessionDrivers.memory(),
  },
});

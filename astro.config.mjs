import { defineConfig, sessionDrivers } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";

export default defineConfig({
  adapter: node({ mode: "standalone" }),
  integrations: [react()],
  // In-memory driver avoids @astrojs/node’s default fs session base living under the project path.
  // A folder name like `Aaron's wedding` contains `'` and breaks Vite’s generated session-driver import string.
  session: {
    driver: sessionDrivers.memory(),
  },
});

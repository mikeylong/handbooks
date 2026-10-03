import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: Object.fromEntries(
      ["primitives", "icons", "utils", "hooks", "layout"].map((n) => [
        n,
        path.resolve("../sds/src/ui/" + n),
      ]),
    ),
    dedupe: ["react", "react-dom", "react-aria-components", "clsx"],
  },
  server: { host: "127.0.0.1", port: 4192, strictPort: true },
});

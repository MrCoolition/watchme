import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL("./tests/browser", import.meta.url)),
  resolve: { alias: [
    { find: "@/app/actions", replacement: fileURLToPath(new URL("./tests/browser/actions.ts", import.meta.url)) },
    { find: "next/link", replacement: fileURLToPath(new URL("./tests/browser/link.tsx", import.meta.url)) },
    { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
  ] },
  server: { host: "127.0.0.1", port: 4173, strictPort: true, fs: { allow: [workspace] } },
  build: { outDir: "../../.browser-harness", emptyOutDir: true },
});

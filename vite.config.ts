import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// When Netlify Dev (or another proxy) rewrites routes to index.html and requests it with
// headers that make Vite treat it as a module, import-analysis tries to parse HTML as JS.
// This plugin ensures .html files are never fed to the JS transform pipeline.
// Only enable in dev: in production build it would replace index.html with "export {}".
function noHtmlAsModule() {
  return {
    name: "no-html-as-module",
    enforce: "pre" as const,
    transform(_code: string, id: string) {
      if (process.env.NODE_ENV !== "production" && id.endsWith(".html")) {
        return { code: "export {}", map: null }
      }
    },
  }
}

export default defineConfig({
  plugins: [noHtmlAsModule(), react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    host: process.env.VITE_DEV_HOST === "1",
    // When using the network URL (e.g. phone at :5173), proxy API to Netlify dev (8888).
    // Disable proxy when Vite runs on 8888 (E2E) so we don't proxy to self.
    proxy:
      process.env.VITE_E2E === "1"
        ? {}
        : {
            "/.netlify/functions": {
              target: "http://localhost:8888",
              changeOrigin: true,
            },
          },
  },
})

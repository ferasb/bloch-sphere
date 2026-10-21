import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { learnPages } from "./plugins/learnPages.ts";

/**
 * The Content Security Policy, as a <meta> tag because GitHub Pages can't send headers. Everything
 * comes from this site: no third-party scripts, fonts or requests. Inline styles are allowed because
 * KaTeX writes style attributes into its HTML. (frame-ancestors only works as a header, so it's
 * absent.) Added at build time only: the dev server needs inline scripts for hot reload.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function contentSecurityPolicy(): Plugin {
  return {
    name: "content-security-policy",
    apply: "build",
    transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }],
  };
}

/**
 * public/theme-init.js, first in every page's <head>: a classic script, so it applies a picked theme
 * before the first paint. Added here because Vite would warn about it in the HTML (it can't bundle a
 * script that isn't a module), and the path depends on how deep the page is.
 */
function themeInit(): Plugin {
  return {
    name: "theme-init",
    transformIndexHtml: (_, { path }) => [
      { tag: "script", attrs: { src: `${"../".repeat(path.split("/").length - 2)}theme-init.js` }, injectTo: "head-prepend" },
    ],
  };
}

export default defineConfig({
  // Both add to the start of <head>, the later one first: the CSP ends up first, before any script.
  plugins: [react(), learnPages(), themeInit(), contentSecurityPolicy()],
  // Relative asset paths, so the build works from any subpath (e.g. GitHub Pages).
  base: "./",
  build: {
    rolldownOptions: {
      output: {
        // Libraries in their own chunks: they download in parallel and stay cached across app updates.
        codeSplitting: {
          groups: [
            { name: "three", test: /node_modules[\\/]three[\\/]/, priority: 3 },
            { name: "katex", test: /node_modules[\\/]katex[\\/]/, priority: 3 },
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler|@react-three|zustand|three-stdlib|its-fine)[\\/]/, priority: 2 },
            { name: "vendor", test: /node_modules[\\/]/, priority: 1 },
          ],
        },
      },
    },
    // The three.js chunk is ~740 kB on its own (R3F registers the whole library); allow it, but
    // warn if any chunk grows past it.
    chunkSizeWarningLimit: 800,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});

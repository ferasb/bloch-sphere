import path from "node:path";
import { runnerImport, type Plugin } from "vite";

/**
 * The Learn pages (src/learn/): static HTML written when the site is built, from React components and
 * the app's own math, so they read without JavaScript and can't disagree with the app.
 *
 * Each page becomes one more HTML entry of the build (learn/…/index.html, served at /learn/…/), so
 * Vite bundles its stylesheet and script and the other plugins (the CSP) see it like index.html.
 * The dev server renders them on request. Also writes sitemap.xml.
 */

const SITE_MODULE = "src/learn/site.tsx";

interface Site {
  PAGE_PATHS: string[];
  renderPage(path: string): string;
  sitemap(): string;
}

export function learnPages(): Plugin {
  let root = "";
  let site: Site;
  /** The HTML file of each page: <root>/learn/qubit/index.html → "learn/qubit/". */
  const pageOf = (id: string): string | null => {
    const rel = path.relative(root, id).split(path.sep).join("/");
    const page = rel.endsWith("index.html") ? rel.slice(0, -"index.html".length) : null;
    return page && site?.PAGE_PATHS.includes(page) ? page : null;
  };

  return {
    name: "learn-pages",
    enforce: "pre",

    async config(config, { command }) {
      root = path.resolve(config.root ?? process.cwd());
      if (command !== "build") {
        return;
      }
      site = (await runnerImport<Site>(path.join(root, SITE_MODULE), { configFile: false, root, logLevel: "error" })).module;
      const input: Record<string, string> = { index: path.join(root, "index.html") };
      for (const page of site.PAGE_PATHS) {
        input[page.slice(0, -1)] = path.join(root, page, "index.html");
      }
      return { build: { rolldownOptions: { input } } };
    },

    resolveId(id) {
      return pageOf(id) ? id : null;
    },

    load(id) {
      const page = pageOf(id);
      return page ? site.renderPage(page) : null;
    },

    generateBundle() {
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: site.sitemap() });
    },

    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? "").split(/[?#]/)[0];
        if (!url.startsWith("/learn")) {
          return next();
        }
        try {
          // Loaded fresh through the dev server, so edits to the pages show on reload.
          const dev = (await server.ssrLoadModule(path.join(root, SITE_MODULE))) as Site;
          const page = url.slice(1);
          if (!page.endsWith("/") && dev.PAGE_PATHS.includes(`${page}/`)) {
            res.writeHead(301, { Location: `${url}/` }).end();
            return;
          }
          if (!dev.PAGE_PATHS.includes(page)) {
            return next();
          }
          const html = await server.transformIndexHtml(url, dev.renderPage(page));
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);
        } catch (e) {
          next(e);
        }
      });
    },
  };
}

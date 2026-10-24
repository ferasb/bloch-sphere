import { describe, expect, it } from "vitest";
import { gateLearnPath } from "../format/gateNames";
import { GLOSSARY } from "../format/glossary";
import { parseLink } from "../model/link";
import { BOOK_URL } from "./components";
import { PAGE_PATHS, PAGES, renderPage, SITE_URL, sitemap } from "./site";

/** Files in public/ that pages may link to. */
const PUBLIC_FILES = ["about.html", "privacy.html", "favicon.svg", "favicon.ico", "apple-touch-icon.png"];

/** Other sites pages may link to; the book at its home page only, since its section pages move (design.md §13.1). */
const OTHER_SITES = ["https://github.com/ferasb/bloch-sphere", "https://ferasbisharat.com", BOOK_URL];

/** Resolve a relative href against a page's path: ("learn/gates/x/", "../../qubit/") → "learn/qubit/". */
function resolve(from: string, href: string): string {
  const url = new URL(href, `https://example.org/${from}`);
  return url.pathname.slice(1) + url.hash;
}

const rendered = PAGES.map((page) => ({ page, html: renderPage(page.path) }));

describe("Learn pages", () => {
  it("have titles and descriptions that fit search results, all different", () => {
    for (const { title, description } of PAGES) {
      expect(title.length, title).toBeLessThanOrEqual(60);
      expect(description.length, description).toBeGreaterThanOrEqual(70);
      expect(description.length, description).toBeLessThanOrEqual(155);
    }
    expect(new Set(PAGES.map((p) => p.title)).size).toBe(PAGES.length);
    expect(new Set(PAGES.map((p) => p.description)).size).toBe(PAGES.length);
    expect(new Set(PAGE_PATHS).size).toBe(PAGES.length);
  });

  it.each(rendered.map(({ page, html }) => [page.path, html]))("%s has one h1, a canonical URL and breadcrumbs", (path, html) => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain(`<link rel="canonical" href="https://bloch-sphere.ferasbisharat.com/${path}" />`);
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)![1];
    expect(JSON.parse(json)["@type"]).toBe("BreadcrumbList");
  });

  it.each(rendered.map(({ page, html }) => [page.path, html]))("%s links only to pages and sites that exist, and its Try it links work", (path, html) => {
    for (const [, href] of html.matchAll(/href="([^"]*)"/g)) {
      if (/^https?:/.test(href)) {
        if (!href.startsWith(SITE_URL)) {
          expect(OTHER_SITES, href).toContain(href);
        }
        continue;
      }
      if (href.startsWith("/src/")) {
        continue;
      }
      const target = resolve(path, href.replace(/&amp;/g, "&"));
      const [file, hash] = target.split("#");
      if (file === "") {
        // The app: either its plain address or a link that sets it up.
        expect(hash === undefined || parseLink(`#${hash}`) !== null, href).toBe(true);
      } else {
        expect([...PAGE_PATHS, ...PUBLIC_FILES], href).toContain(file);
      }
    }
  });

  it("are all in the sitemap", () => {
    const xml = sitemap();
    for (const path of PAGE_PATHS) {
      expect(xml).toContain(`<loc>https://bloch-sphere.ferasbisharat.com/${path}</loc>`);
    }
  });

  it("include every page the app links to", () => {
    const fromApp = [...Object.values(GLOSSARY).map((e) => e.learn), ...["X", "Y", "Z", "H", "S", "T", "S†", "T†", "Rx(45°)"].map((g) => gateLearnPath(g)!)];
    for (const path of fromApp) {
      expect(PAGE_PATHS).toContain(path);
    }
  });
});

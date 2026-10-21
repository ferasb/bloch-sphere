import { renderToStaticMarkup } from "react-dom/server";
import { A, PageContext, relative } from "./components";
import { PAGES, type Page } from "./pages";

/**
 * The Learn pages as static HTML: each page's document, and the sitemap. The build (plugins/learnPages.ts)
 * turns each into a file; Vite then bundles the stylesheet and script they link to.
 */

export const SITE_URL = "https://bloch-sphere.ferasbisharat.com/";
const REPO_URL = "https://github.com/ferasb/bloch-sphere";

export { PAGES };

/** Every page's path, for the build's list of HTML files. */
export const PAGE_PATHS = PAGES.map((p) => p.path);

/** The pages above this one: Learn, then (for a gate) Gates. */
function ancestors(page: Page): Page[] {
  return PAGES.filter((p) => p !== page && page.path.startsWith(p.path));
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Drawn on a 24-unit grid, like the app's theme button (ui/controls/ThemeButton.tsx). CSS shows the
// theme it switches to: the moon in light, the sun in dark.
function ThemeButton() {
  return (
    <button type="button" className="theme-button" aria-label="Switch between light and dark" title="Switch between light and dark">
      <svg className="icon-dark" viewBox="0 0 24 24" aria-hidden>
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
      <svg className="icon-light" viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}

function Layout({ page }: { page: Page }) {
  const guides = PAGES.slice(1);
  const index = guides.indexOf(page);
  const prev = index > 0 ? guides[index - 1] : index === 0 ? PAGES[0] : null;
  const next = index >= 0 ? guides[index + 1] : guides[0];
  const Body = page.Body;
  return (
    <>
      <header className="site-header">
        <A to="">
          <span className="site-title">Bloch Sphere</span>
        </A>
        <nav className="site-nav" aria-label="Site">
          <A to="learn/">Learn</A>
          <A to="">Open the sphere</A>
          <ThemeButton />
        </nav>
      </header>
      <main>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol>
            {ancestors(page).map((p) => (
              <li key={p.path}>
                <A to={p.path}>{p.name}</A>
              </li>
            ))}
            <li aria-current="page">{page.name}</li>
          </ol>
        </nav>
        <article>
          <h1>{page.heading}</h1>
          <Body />
        </article>
        <nav className="pager" aria-label="Guides">
          {prev && (
            <A to={prev.path}>
              <span className="pager-dir">← Previous</span>
              <span className="pager-name">{prev.name}</span>
            </A>
          )}
          {next && (
            <A to={next.path} className="next">
              <span className="pager-dir">Next →</span>
              <span className="pager-name">{next.name}</span>
            </A>
          )}
        </nav>
      </main>
      <footer className="site-footer">
        <p>
          <A to="">Bloch Sphere</A> is a free, open-source interactive Bloch sphere. <A to="about.html">About</A> ·{" "}
          <A to="privacy.html">Privacy</A> · <a href={REPO_URL}>Source on GitHub</a>
        </p>
        <p>
          Made by Feras Bisharat: <a href="https://ferasbisharat.com">ferasbisharat.com</a>
        </p>
      </footer>
    </>
  );
}

/** schema.org breadcrumbs, so search results can show where a page sits. */
function breadcrumbJson(page: Page): string {
  const trail = [{ name: "Bloch Sphere", url: SITE_URL }, ...[...ancestors(page), page].map((p) => ({ name: p.name, url: SITE_URL + p.path }))];
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.name, item: t.url })),
  };
  // Inside <script>, "<" could end the element early.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** A page as a complete HTML document. */
export function renderPage(path: string): string {
  const page = PAGES.find((p) => p.path === path);
  if (!page) {
    throw new Error(`No Learn page at ${path}`);
  }
  const body = renderToStaticMarkup(
    <PageContext.Provider value={page.path}>
      <Layout page={page} />
    </PageContext.Provider>,
  );
  const root = relative(page.path, "");
  const url = SITE_URL + page.path;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="referrer" content="no-referrer" />
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}" />
    <link rel="canonical" href="${url}" />
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="oklch(0.985 0.005 264)" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="oklch(0.15 0.025 264)" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="Bloch Sphere" />
    <meta property="og:title" content="${escapeHtml(page.heading)}" />
    <meta property="og:description" content="${escapeHtml(page.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE_URL}og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="A Bloch sphere with a qubit's arrow turned by a gate" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="${root}favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="${root}favicon.ico" sizes="32x32" />
    <link rel="apple-touch-icon" href="${root}apple-touch-icon.png" />
    <link rel="stylesheet" href="/src/learn/learn.css" />
    <script type="module" src="/src/learn/page.ts"></script>
    <script type="application/ld+json">${breadcrumbJson(page)}</script>
  </head>
  <body>
    ${body}
  </body>
</html>
`;
}

/** Every page of the site, for search engines. */
export function sitemap(): string {
  const urls = ["", ...PAGE_PATHS, "about.html", "privacy.html"].map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;
}

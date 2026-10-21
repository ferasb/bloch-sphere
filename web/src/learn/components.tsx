import katex from "katex";
import { createContext, useContext, type ReactNode } from "react";
import { linkHash, parseLink, type Link } from "../model/link";

/**
 * Building blocks for the Learn pages. They render to static HTML when the site is built (render.tsx);
 * nothing here runs in the browser.
 */

/** The page being rendered, so links can be written relative to it. */
export const PageContext = createContext<string>("");

/** `to` relative to the page at `from` (both site paths like "learn/qubit/"; "" is the app). */
export function relative(from: string, to: string): string {
  const depth = from.split("/").filter(Boolean).length - (from.endsWith("/") || from === "" ? 0 : 1);
  return "../".repeat(depth) + to || "./";
}

/**
 * LaTeX as HTML, typeset now. A mistake in the LaTeX fails the build rather than showing red text,
 * and `strict` rejects anything KaTeX would only warn about.
 */
export function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, { displayMode: display, throwOnError: true, strict: "error", output: "htmlAndMathml" });
  return display ? <div className="math-block" dangerouslySetInnerHTML={{ __html: html }} /> : <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Inline math from a template literal: m`|0\rangle`. Backslashes stay as written. */
export function m(strings: TemplateStringsArray, ...values: unknown[]) {
  return <Tex tex={String.raw(strings, ...values)} />;
}

/** Display math (its own line, centered). */
export function md(strings: TemplateStringsArray, ...values: unknown[]) {
  return <Tex tex={String.raw(strings, ...values)} display />;
}

/** A ket: k`+i` is |+i⟩ (braced, so its sign isn't spaced like an operator). */
export function k(strings: TemplateStringsArray, ...values: unknown[]) {
  return <Tex tex={`|{${String.raw(strings, ...values)}}\\rangle`} />;
}

/** A link to another page of the site, written relative to this one. */
export function A({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const from = useContext(PageContext);
  return (
    <a className={className} href={relative(from, to)}>
      {children}
    </a>
  );
}

/** A link written as its URL hash ("#/?start=0&gates=H"); a mistake in it fails the build. */
export function link(hash: string): Link {
  const parsed = parseLink(hash);
  if (!parsed) {
    throw new Error(`Not a valid link: ${hash}`);
  }
  return parsed;
}

/** "Try it": opens the app set up by a link (model/link.ts). */
export function TryIt({ hash, children }: { hash: string; children: ReactNode }) {
  const from = useContext(PageContext);
  return (
    <a className="try-it" href={relative(from, "") + linkHash(link(hash))}>
      <span className="try-it-label">Try it</span> {children}
    </a>
  );
}

/** Several Try it links in a row. */
export function TryRow({ children }: { children: ReactNode }) {
  return <div className="try-row">{children}</div>;
}

/** A figure with a caption. */
export function Figure({ children, caption }: { children: ReactNode; caption: ReactNode }) {
  return (
    <figure className="figure">
      {children}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** Text with a figure beside it on wide screens, and above it on narrow ones. */
export function Beside({ children, figure }: { children: ReactNode; figure: ReactNode }) {
  return (
    <div className="beside">
      <div>{children}</div>
      {figure}
    </div>
  );
}

/** An aside: a common mistake, a caveat, or something to notice. */
export function Note({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="note">
      <p className="note-title">{title}</p>
      {children}
    </aside>
  );
}

/** A section with its heading; `id` makes it linkable. */
export function Section({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

# Deploying

The site is static: `npm run build` in `web/` produces `web/dist/`, which any static host can serve. It's set up for **GitHub Pages**, deployed by `.github/workflows/deploy.yml`.

## First deploy

1. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
2. In **Actions → Deploy to GitHub Pages**, choose **Run workflow**. It runs the tests, builds, and publishes; the site appears at `https://<user>.github.io/bloch-sphere/`.
3. To publish on every push to `main` from then on, add a repository variable (**Settings → Secrets and variables → Actions → Variables**) named `DEPLOY_PAGES` with the value `true`. Until then, pushes skip the deploy.

Asset paths are relative (`base: "./"` in `vite.config.ts`), so the same build works under `/bloch-sphere/` and at the root of a custom domain.

## Custom domain

1. **Verify the domain first** (your GitHub account's **Settings → Pages → Add a domain**). This stops anyone else's repository from claiming it if your DNS ever points at GitHub without a site behind it.
2. **DNS**, at your domain registrar:
   - a subdomain (e.g. `bloch.example.com`): a `CNAME` record pointing to `<user>.github.io`;
   - the bare domain (e.g. `example.com`): `A` records for `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, and `AAAA` records for `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153` and `2606:50c0:8003::153`, plus a `CNAME` for `www` pointing to `<user>.github.io`. Check these against [GitHub's documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site), in case they change.
3. In the repository's **Settings → Pages**, enter the domain under **Custom domain**. With deploys from Actions, no `CNAME` file is needed in the repository.
4. When GitHub has issued the certificate (minutes to a day), tick **Enforce HTTPS**.

## Security and privacy

- **Content Security Policy.** The build adds a `<meta>` CSP (in `vite.config.ts`): scripts, styles, fonts and requests only from the site itself. The privacy page carries its own, stricter one. Check the browser console for "Refused to…" errors after changing what the page loads.
- **What GitHub Pages can't do.** It can't send custom HTTP headers, so there's no HSTS, `Permissions-Policy` or `frame-ancestors` (anti-framing). For this site the risk is low: there are no logins, and nothing is sent anywhere. If you want them, host on Cloudflare Pages (headers in a `_headers` file) or put Cloudflare in front of GitHub Pages. A `.dev` or `.app` domain is HTTPS-only in every browser by itself, since those whole domains are on the browsers' HSTS preload list.
- **Cookies.** The site sets none and has no analytics or third-party requests, so it needs no cookie banner. It keeps the visitor's own work in `sessionStorage` and `localStorage`, explained on the privacy page (`web/public/privacy.html`, linked from the top bar). If you ever add analytics, embeds or fonts from another site, update the privacy page, and check whether you then need consent.
- **Legal notice.** Depending on where you live and whether the site is commercial, you may need more than a privacy page (in Germany, for example, an *Impressum*). Check the rules that apply to you.

## After the domain is live

- Add the address to the repository's **About** box (the website field) and to the privacy page if you like.
- Optionally add `<link rel="canonical">` and an `og:image` (a screenshot, by absolute URL) to `web/index.html`, for nicer link previews.

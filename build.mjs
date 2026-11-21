// Builds sealctl.com into dist/: wraps page bodies in one layout, renders the docs
// from Markdown, fingerprints assets, writes sitemap.xml and security.txt, and fails
// on a missing front-matter field, a broken internal link or anchor, an image without
// alt text, or a page title over 60 characters.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import config from "./site.config.mjs";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const errors = [];
const fail = (msg) => errors.push(msg);

const read = (p) => fs.readFileSync(p, "utf8");
const write = (rel, data) => {
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (s) => ("" + s).toLowerCase().replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").replace(/[`'"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/^(\d)/, "s$1");

const now = new Date();
const ctx = { ...config, year: now.getUTCFullYear() };

// ---------- templating ----------

function lookup(obj, key) {
  return key.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function fill(text, vars, where) {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, key) => {
    const v = lookup(vars, key);
    if (v === undefined) {
      fail(`${where}: unknown template variable {{${key}}}`);
      return m;
    }
    return String(v);
  });
}

// Front matter: a block of `key: value` lines between two `---` lines at the top.
function frontMatter(text, where) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) {
    fail(`${where}: no front matter`);
    return { meta: {}, body: text };
  }
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v === "true") v = true;
    else if (v === "false") v = false;
    else if (v.startsWith("[")) v = v.slice(1, -1).split(",").map((s) => s.trim()).filter(Boolean);
    meta[kv[1]] = v;
  }
  for (const field of ["title", "description"]) {
    if (!meta[field]) fail(`${where}: front matter is missing "${field}"`);
  }
  if (meta.title && meta.title.length > 60) fail(`${where}: title over 60 characters (${meta.title.length})`);
  return { meta, body: text.slice(m[0].length) };
}

// ---------- assets ----------

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

const assetMap = new Map(); // "/assets/site.css" -> "/assets/site.3f9a1c2b.css"
function emitAsset(urlPath, data) {
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 8);
  const ext = path.extname(urlPath);
  const hashed = urlPath.slice(0, -ext.length) + "." + hash + ext;
  write(hashed, data);
  assetMap.set(urlPath, hashed);
}

// One stylesheet: the brand tokens, then the site's own CSS.
emitAsset("/assets/site.css", read(path.join(SRC, "assets/tokens.css")) + "\n" + read(path.join(SRC, "assets/site.css")));
for (const dir of ["js", "img"]) {
  for (const f of fs.readdirSync(path.join(SRC, "assets", dir))) {
    emitAsset(`/assets/${dir}/${f}`, fs.readFileSync(path.join(SRC, "assets", dir, f)));
  }
}
// Files served at fixed paths (not fingerprinted).
for (const f of ["favicon.svg", "apple-touch-icon.png", "social-preview.png", "robots.txt", "_redirects"]) {
  const p = path.join(SRC, f);
  if (fs.existsSync(p)) write(f, fs.readFileSync(p));
}

// ---------- layout ----------

const layout = read(path.join(SRC, "layout.html"));
const navItems = (current) =>
  config.nav
    .map((n) => {
      const active = current === n.href || (n.href !== "/" && current.startsWith(n.href.replace(/\/$/, "")));
      return `<li><a href="${n.href}"${active ? ' aria-current="page"' : ""}>${n.label}</a></li>`;
    })
    .join("");
const footerItems = config.footer.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join("");

function strip() {
  const r = config.release;
  const unseal = r.unsealReleased
    ? `The current release, ${r.current}, keeps keys on a Ledger and can hand everything back with <code>sealctl unseal --all</code>.`
    : `The current release, ${r.current}, keeps keys on a Ledger. ${r.unsealVersion}, coming next, adds <code>sealctl unseal --all</code> to hand everything back.`;
  return `<aside class="strip" aria-label="Project status"><div class="wrap"><p><strong>In development.</strong> ${unseal} The phone version described on this site is being built in the open. <a href="${config.github.cli}">GitHub</a> · <a href="/docs/from-ledger">Moving from the Ledger version</a></p></div></aside>\n`;
}

const pages = new Map(); // url path -> { file, html }

function render({ urlPath, outFile, meta, body, where }) {
  const scripts = (meta.scripts || []).map((s) => `<script src="/assets/js/${s}.js" defer></script>\n`).join("");
  const noindex = config.prelaunch || meta.noindex === true;
  const vars = {
    ...ctx,
    title: esc(meta.title),
    fullTitle: esc(urlPath === "/" ? `sealctl · ${meta.title}` : `${meta.title} · sealctl`),
    description: esc(meta.description),
    canonical: config.origin + urlPath,
    robots: noindex ? '<meta name="robots" content="noindex">\n' : "",
    scripts,
    bodyClass: meta.bodyClass || "",
    navItems: navItems(urlPath),
    footerItems,
    strip: meta.strip === false ? "" : strip(),
  };
  // The body is filled first so that its text can't inject layout variables.
  const filledBody = fill(body, { ...ctx, ...(meta.vars || {}) }, where);
  let html = fill(layout.replace("{{body}}", "\u0000BODY\u0000"), vars, "layout.html").replace("\u0000BODY\u0000", filledBody);
  for (const [from, to] of assetMap) html = html.split(`"${from}"`).join(`"${to}"`);
  // Scrollable regions must be reachable by keyboard.
  html = html.replace(/<div class="table-wrap( wide)?">/g, '<div class="table-wrap$1" tabindex="0">').replace(/<pre>/g, '<pre tabindex="0">').replace(/<div class="cmd"><code>/g, '<div class="cmd"><code tabindex="0">');
  write(outFile, html);
  pages.set(urlPath, { file: outFile, html, noindex: meta.noindex === true });
}

// ---------- pages ----------

const pageDir = path.join(SRC, "pages");
for (const f of fs.readdirSync(pageDir).filter((f) => f.endsWith(".html")).sort()) {
  const where = `src/pages/${f}`;
  const { meta, body } = frontMatter(read(path.join(pageDir, f)), where);
  const name = f.replace(/\.html$/, "");
  if (name === "status") continue; // rendered below with the incidents
  if (name === "pay") {
    for (const env of ["live", "sandbox"]) {
      const tokenVar = env === "live" ? config.paddle.liveTokenVar : config.paddle.sandboxTokenVar;
      const token = process.env[tokenVar] || "";
      render({
        urlPath: env === "live" ? "/pay" : "/pay/sandbox",
        outFile: env === "live" ? "pay.html" : "pay/sandbox.html",
        meta: { ...meta, vars: { paddleEnv: env, paddleToken: esc(token), sandboxNote: env === "sandbox" ? '<p class="callout warn">Sandbox: test cards only.</p>' : "" } },
        body,
        where,
      });
    }
    continue;
  }
  const urlPath = name === "index" ? "/" : `/${name}`;
  render({ urlPath, outFile: `${name}.html`, meta, body, where });
}

// ---------- docs ----------

const marked = new Marked({ gfm: true });
marked.use({
  renderer: {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      return `<h${depth} id="${slug(text)}">${text}</h${depth}>\n`;
    },
    table(token) {
      const head = token.header.map((c) => `<th>${this.parser.parseInline(c.tokens)}</th>`).join("");
      const rows = token.rows.map((r) => `<tr>${r.map((c) => `<td>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`).join("\n");
      return `<div class="table-wrap" tabindex="0"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
    },
  },
});

const docsDir = path.join(SRC, "docs");
const nav = JSON.parse(read(path.join(docsDir, "nav.json")));
const docSlugs = new Set(fs.readdirSync(docsDir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, "")));

function lastCommitDate(file) {
  try {
    const d = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { cwd: ROOT, encoding: "utf8" }).trim();
    return d || now.toISOString().slice(0, 10);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

function sidebar(current) {
  return nav
    .map((sec) => {
      const items = sec.pages
        .map((p) => {
          if (p.href) return `<li><a href="${p.href}"${p.href === current ? ' aria-current="page"' : ""}>${p.title}</a></li>`;
          if (p.slug) {
            const href = `/docs/${p.slug}`;
            return `<li><a href="${href}"${href === current ? ' aria-current="page"' : ""}>${p.title}</a></li>`;
          }
          return `<li class="planned-item">${p.title} <span class="soon">soon</span></li>`;
        })
        .join("");
      return `<h2>${sec.section}</h2><ul>${items}</ul>`;
    })
    .join("\n");
}

function docsPage({ urlPath, outFile, meta, html, source }) {
  const edit = source
    ? `<p class="doc-meta"><a href="${config.github.website}/edit/main/${source}">Edit this page on GitHub</a> · Last changed ${lastCommitDate(source)}</p>`
    : "";
  const body = `<div class="wrap docs">
<nav class="docs-nav" aria-label="Docs">
<details open><summary>All docs</summary>
${sidebar(urlPath)}
</details>
</nav>
<article class="prose doc">
${html}
${edit}
</article>
</div>`;
  render({ urlPath, outFile, meta: { ...meta, scripts: ["copy", ...(meta.scripts || [])], bodyClass: "docs-page" }, body, where: source || outFile });
}

for (const s of docSlugs) {
  const source = `src/docs/${s}.md`;
  const { meta, body } = frontMatter(read(path.join(ROOT, source)), source);
  const html = marked.parse(fill(body, ctx, source));
  docsPage({ urlPath: s === "index" ? "/docs/" : `/docs/${s}`, outFile: s === "index" ? "docs/index.html" : `docs/${s}.html`, meta, html, source });
}
for (const sec of nav) for (const p of sec.pages) if (p.slug && !docSlugs.has(p.slug)) fail(`src/docs/nav.json: no page for slug "${p.slug}"`);

// ---------- status incidents ----------
// The status page body has {{incidents}}; it is rendered from src/status/incidents.md.
// (Handled by re-rendering status.html with the incidents filled in.)
{
  const md = read(path.join(SRC, "status/incidents.md"));
  const { meta: _m, body } = frontMatter(md, "src/status/incidents.md");
  const incidents = marked.parse(body);
  const where = "src/pages/status.html";
  const page = frontMatter(read(path.join(pageDir, "status.html")), where);
  render({ urlPath: "/status", outFile: "status.html", meta: { ...page.meta, vars: { incidents } }, body: page.body, where });
}

// ---------- generated files ----------

const expires = new Date(now.getTime() + 365 * 86400e3).toISOString().replace(/\.\d{3}Z$/, "Z");
write(
  ".well-known/security.txt",
  [
    `Contact: ${config.github.advisory}`,
    `Contact: mailto:${config.email.security}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en, pl",
    `Canonical: ${config.origin}/.well-known/security.txt`,
    `Policy: ${config.github.securityPolicy}`,
    "",
  ].join("\n"),
);

const sitemapUrls = [...pages.entries()].filter(([u, p]) => !p.noindex).map(([u]) => u).sort();
write(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((u) => `  <url><loc>${config.origin}${u}</loc></url>`).join("\n")}\n</urlset>\n`,
);

write("_headers", fill(read(path.join(SRC, "_headers")), { ...ctx, prelaunchRobots: config.prelaunch ? "  X-Robots-Tag: noindex\n" : "" }, "src/_headers"));

// ---------- checks ----------

const served = new Set(["/sitemap.xml", "/.well-known/security.txt"]);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
for (const f of walk(DIST)) served.add("/" + path.relative(DIST, f));
for (const line of read(path.join(SRC, "_redirects")).split("\n")) {
  const from = line.trim().split(/\s+/)[0];
  if (from && !from.startsWith("#")) served.add(from);
}

const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const pageIds = new Map([...pages].map(([u, p]) => [u, idsOf(p.html)]));

for (const [urlPath, { file, html }] of pages) {
  const where = `dist/${file}`;
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) fail(`${where}: image without alt: ${m[0]}`);
  if (/\sstyle="/.test(html)) fail(`${where}: inline style attribute (blocked by the CSP)`);
  if (/<script(?![^>]*\ssrc=)[^>]*>/.test(html.replace(/<script type="application\/ld\+json">/g, ""))) fail(`${where}: inline script (blocked by the CSP)`);
  for (const m of html.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|data:)/.test(ref)) continue;
    const [p, hash] = ref.split("#");
    const target = p === "" ? urlPath : p;
    let page = pages.has(target) ? target : null;
    if (!page && !served.has(target)) {
      fail(`${where}: broken link ${ref}`);
      continue;
    }
    if (hash && page && !pageIds.get(page).has(hash)) fail(`${where}: broken anchor ${ref}`);
  }
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) fail(`${where}: duplicate ids ${[...new Set(dup)].join(", ")}`);
}

if (errors.length) {
  console.error(errors.map((e) => "build: " + e).join("\n"));
  process.exit(1);
}
console.log(`build: ${pages.size} pages, ${assetMap.size} assets → dist/`);

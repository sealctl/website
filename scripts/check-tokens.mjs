// Token checks: tokens.css matches the brand file upstream, site.css has no raw colours
// outside its three token blocks, and text/background pairs pass WCAG AA (4.5:1) in
// both themes. Run: node scripts/check-tokens.mjs [--offline]
import fs from "node:fs";

const UPSTREAM = "https://raw.githubusercontent.com/sealctl/.github/main/brand/tokens.css";
const tokensCss = fs.readFileSync("src/assets/tokens.css", "utf8");
const siteCss = fs.readFileSync("src/assets/site.css", "utf8");
let failed = false;
const bad = (m) => { console.error("FAIL " + m); failed = true; };
const ok = (m) => console.log("ok   " + m);

// 1. Same bytes as upstream.
if (!process.argv.includes("--offline")) {
  try {
    const r = await fetch(UPSTREAM);
    const up = await r.text();
    if (!r.ok) bad(`could not fetch upstream tokens.css (${r.status})`);
    else if (up !== tokensCss) bad("src/assets/tokens.css differs from brand/tokens.css upstream");
    else ok("tokens.css matches brand/tokens.css upstream");
  } catch (e) {
    bad("could not fetch upstream tokens.css: " + e.message);
  }
}

// 2. No raw colours outside the token blocks (the first three rule blocks of site.css).
const blocksEnd = siteCss.indexOf("/* ---------- base ---------- */");
const rest = siteCss.slice(blocksEnd);
const raw = rest.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g);
if (raw) bad(`raw colours in site.css outside token blocks: ${raw.join(", ")}`);
else ok("site.css uses tokens only outside its token blocks");

// 3. Contrast.
const vars = (css, which) => {
  // which: "light" = first :root block; "dark" = the :root[data-theme="dark"] block
  const block = which === "light" ? css.match(/^:root \{([\s\S]*?)\n\}/m)[1] : css.match(/:root\[data-theme="dark"\] \{([\s\S]*?)\n\}/)[1];
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
};
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const pairs = [
  ["ink", "paper"], ["ink", "surface"], ["ink", "surface-2"],
  ["ink-2", "paper"], ["ink-2", "surface"], ["ink-2", "surface-2"],
  ["muted", "paper"], ["muted", "surface"], ["muted", "surface-2"],
  ["accent", "surface-2"],
  ["accent", "paper"], ["accent", "surface"], ["accent", "accent-soft"], ["accent-hover", "paper"],
  ["on-accent", "accent"], ["on-accent", "accent-hover"],
  ["ink", "accent-soft"],
  ["ok", "surface"], ["ok", "ok-soft"], ["wait", "surface"], ["wait", "surface-2"], ["wait", "paper"],
  ["term-text", "term-bg"], ["term-dim", "term-bg"], ["term-ok", "term-bg"], ["term-key", "term-bg"],
];
const results = [];
for (const theme of ["light", "dark"]) {
  const t = { ...vars(tokensCss, theme), ...vars(siteCss, theme) };
  for (const [fg, bg] of pairs) {
    if (!t[fg] || !t[bg]) { bad(`${theme}: missing token ${!t[fg] ? fg : bg}`); continue; }
    const r = ratio(t[fg], t[bg]);
    results.push(`${theme.padEnd(5)} ${fg.padEnd(12)} on ${bg.padEnd(11)} ${r.toFixed(2)}:1`);
    if (r < 4.5) bad(`${theme}: ${fg} on ${bg} is ${r.toFixed(2)}:1, below 4.5:1`);
  }
}
console.log(results.join("\n"));
if (failed) process.exit(1);
ok("all text pairs pass 4.5:1 in both themes");

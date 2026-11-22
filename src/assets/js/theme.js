// Theme: auto (system), light or dark. Loaded in <head> without defer, so the choice applies
// before the first paint. Stored per browser; the site works the same without it.
(() => {
  const KEY = "theme";
  const root = document.documentElement;
  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const write = (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} };
  const system = () => (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  function apply(choice) {
    if (choice === "light" || choice === "dark") root.dataset.theme = choice;
    else delete root.dataset.theme;
    const effective = root.dataset.theme || system();
    // the logo's <picture> follows the media query only; point it at the chosen theme
    for (const s of document.querySelectorAll("source[data-theme-source]")) {
      s.media = choice ? (effective === "dark" ? "all" : "not all") : "(prefers-color-scheme: dark)";
    }
    const btn = document.querySelector(".theme-toggle");
    if (btn) {
      const label = choice ? choice[0].toUpperCase() + choice.slice(1) : "Auto";
      btn.dataset.mode = choice || "auto";
      btn.setAttribute("aria-label", `Theme: ${label}. Change theme`);
      btn.title = `Theme: ${label}`;
    }
  }

  apply(read());
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    btn.hidden = false;
    apply(read());
    btn.addEventListener("click", () => {
      const order = [null, "light", "dark"];
      const next = order[(order.indexOf(read()) + 1) % order.length];
      write(next);
      apply(next);
    });
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => apply(read()));
})();

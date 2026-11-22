// Theme: auto (system), light or dark. Loaded in <head> without defer, so data-theme is set
// before the first paint; CSS does the rest (colours, color-scheme, which logo shows). The
// choice lives in memory and is saved per browser when storage allows; the site works the
// same without it.
(() => {
  const KEY = "theme";
  const root = document.documentElement;
  const valid = (v) => (v === "light" || v === "dark" ? v : null);
  let current = null;
  try { current = valid(localStorage.getItem(KEY)); } catch {}

  function save(v) {
    try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {}
  }

  function apply() {
    if (current) root.dataset.theme = current;
    else delete root.dataset.theme;
    const btn = document.querySelector(".theme-toggle");
    if (btn) {
      const label = current ? current[0].toUpperCase() + current.slice(1) : "Auto";
      btn.dataset.mode = current || "auto";
      btn.setAttribute("aria-label", `Theme: ${label}. Change theme`);
      btn.title = `Theme: ${label}`;
    }
  }

  apply();
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.querySelector(".theme-toggle");
    if (!btn) return;
    btn.hidden = false;
    apply();
    btn.addEventListener("click", () => {
      const order = [null, "light", "dark"];
      current = order[(order.indexOf(current) + 1) % order.length];
      save(current);
      apply();
    });
  });
})();

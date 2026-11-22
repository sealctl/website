// Docs page: marks the section being read in the contents list, keeps it in view in the
// sidebar, and closes the phone contents bar after a link is chosen. The page works without it.
(() => {
  const bar = document.querySelector(".toc-bar");
  const side = document.querySelector(".toc-side");
  if (bar) {
    bar.addEventListener("click", (e) => {
      if (e.target.closest("a")) bar.open = false;
    });
  }

  const links = new Map(); // id -> [a, a]
  document.querySelectorAll(".toc-nav a[href^='#']").forEach((a) => {
    const id = decodeURIComponent(a.getAttribute("href").slice(1));
    if (!links.has(id)) links.set(id, []);
    links.get(id).push(a);
  });
  const heads = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (!heads.length) return;

  let current = null;
  const mark = (id) => {
    if (id === current) return;
    if (current) links.get(current).forEach((a) => a.removeAttribute("aria-current"));
    current = id;
    if (!id) return;
    links.get(id).forEach((a) => a.setAttribute("aria-current", "location"));
    // Keep the marked entry visible inside the sidebar without moving the page.
    const a = side && side.querySelector(`a[aria-current]`);
    if (a && side.scrollHeight > side.clientHeight) {
      const top = a.getBoundingClientRect().top - side.getBoundingClientRect().top + side.scrollTop;
      if (top < side.scrollTop + 40 || top > side.scrollTop + side.clientHeight - 60) {
        side.scrollTop = Math.max(0, top - side.clientHeight / 3);
      }
    }
  };

  // The current section is the last heading above the top fifth of the window.
  const pick = () => {
    const line = window.innerHeight * 0.2;
    let id = null;
    for (const h of heads) {
      if (h.getBoundingClientRect().top <= line) id = h.id;
      else break;
    }
    mark(id || heads[0].id);
  };
  let queued = false;
  const later = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; pick(); });
  };
  window.addEventListener("scroll", later, { passive: true });
  window.addEventListener("resize", later);
  pick();
})();

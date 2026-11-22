// Paddle checkout page. Shows one state at a time; never decides whether someone paid.
(() => {
  const root = document.getElementById("pay");
  if (!root) return;
  const env = root.getAttribute("data-env");
  const token = root.getAttribute("data-token");
  const txn = new URLSearchParams(location.search).get("_ptxn");
  const states = root.querySelectorAll("[data-state]");
  const show = (name) => states.forEach((s) => (s.hidden = s.getAttribute("data-state") !== name));
  const set = (sel, text) => { const el = root.querySelector(sel); if (el) el.textContent = text; };

  if (!txn) return show("none");
  if (!token) return show("unconfigured");
  show("loading");

  let done = false;
  const failed = () => { if (!done && typeof window.Paddle === "undefined") show("noload"); };
  const timer = setTimeout(failed, 10000);
  const s = document.createElement("script");
  s.src = root.getAttribute("data-script");
  s.onerror = () => { clearTimeout(timer); show("noload"); };
  s.onload = () => {
    clearTimeout(timer);
    const P = window.Paddle;
    if (!P) return show("noload");
    // Paddle.js may arrive after the 10 s timer showed "didn't load": the checkout opens now.
    show("loading");
    if (env === "sandbox") P.Environment.set("sandbox");
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    P.Initialize({
      token,
      checkout: { settings: { displayMode: "overlay", theme: dark ? "dark" : "light", locale: "en" } },
      eventCallback: (e) => {
        const name = e && e.name;
        if (name === "checkout.loaded") set("[data-loading-text]", "Checkout is open.");
        else if (name === "checkout.completed") {
          done = true;
          const items = (e.data && e.data.items) || [];
          const seats = items.reduce((n, i) => n + (i.quantity || 0), 0);
          show(seats > 1 ? "paid-seats" : "paid");
        } else if (name === "checkout.closed" && !done) show("closed");
        else if (name === "checkout.error") show("invalid");
      },
    });
  };
  document.head.append(s);
  const reopen = root.querySelector("[data-reopen]");
  if (reopen) reopen.addEventListener("click", () => { show("loading"); window.Paddle && window.Paddle.Checkout.open({ transactionId: txn }); });
  const reload = root.querySelector("[data-reload]");
  if (reload) reload.addEventListener("click", () => location.reload());
})();

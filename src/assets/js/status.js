// Live relay check from the visitor's browser: GET /v1/health with a 5 s timeout.
(() => {
  const box = document.getElementById("live-check");
  if (!box) return;
  const url = box.getAttribute("data-url");
  const text = box.querySelector("[data-text]");
  const dot = box.querySelector(".dot");
  const show = (ok, msg) => { dot.className = "dot " + (ok ? "ok" : "bad"); text.textContent = msg; };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  fetch(url, { cache: "no-store", signal: ctl.signal })
    .then((r) => r.json().then((j) => {
      if (r.ok && j && j.ok === true) show(true, "Relay answering, checked just now from your browser.");
      else show(false, "The relay answered with an error (" + r.status + "), checked just now from your browser.");
    }))
    .catch(() => show(false, "The relay didn't answer from your browser."))
    .finally(() => clearTimeout(timer));
})();

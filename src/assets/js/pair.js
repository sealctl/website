// /p: draws the pairing code from the link's fragment, in this browser only (SPEC.md 11.5).
// The fragment (after #) is never sent to the site, and nothing here sends it anywhere.
(() => {
  const box = document.getElementById("pair-code");
  const frag = location.hash.slice(1);
  if (!box || !frag) return;
  const params = new URLSearchParams(frag);
  if (params.get("v") !== "1" || !params.get("m")) return;
  const status = document.getElementById("pair-status");
  const expires = Number(params.get("e")) * 1000;
  if (expires && expires < Date.now()) {
    status.textContent = "This code has expired. Run sealctl pair again.";
    box.hidden = false;
    return;
  }
  const qr = qrcode(0, "M");
  qr.addData("https://sealctl.com/p#" + frag);
  qr.make();
  const img = document.createElement("img");
  img.src = qr.createDataURL(6, 4);
  img.alt = "Pairing code";
  img.className = "pair-qr";
  document.getElementById("pair-img").replaceChildren(img);
  const name = params.get("n");
  status.textContent = (name ? `Scan this with the sealctl app to pair ${name}.` : "Scan this with the sealctl app.") +
    (expires ? ` It works until ${new Date(expires).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : "");
  box.hidden = false;
})();

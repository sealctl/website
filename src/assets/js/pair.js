// /p: draws the pairing code from the link's fragment, in this browser only (SPEC.md 11.5).
// The fragment (after #) is never sent to the site, and nothing here sends it anywhere.
(() => {
  const box = document.getElementById("pair-code");
  if (!box) return;
  const isPairing = (p) => p.get("v") === "1" && !!p.get("m");
  // A link that differs only after # does not reload the page: draw again from the new fragment.
  // Only a pairing fragment counts, so the skip link (#main) and other anchors leave the code alone.
  addEventListener("hashchange", () => {
    if (isPairing(new URLSearchParams(location.hash.slice(1)))) location.reload();
  });
  const frag = location.hash.slice(1);
  if (!frag) return;
  const params = new URLSearchParams(frag);
  if (!isPairing(params)) return;
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
  // The name comes from the link, so it is shown as the link's claim, not as a fact.
  const name = params.get("n");
  status.textContent = "Scan this with the sealctl app." + (name ? ` The link names the machine ${name}.` : "") +
    (expires ? ` It works until ${new Date(expires).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : "");
  document.getElementById("pair-warn").hidden = false;
  box.hidden = false;
})();

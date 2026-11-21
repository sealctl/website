// Copy buttons for command boxes ([data-copy]) and docs code blocks. Announces "Copied".
(() => {
  const live = document.getElementById("live");
  const say = (t) => { if (live) { live.textContent = ""; setTimeout(() => (live.textContent = t), 50); } };
  const copy = async (btn, text) => {
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; say("Copied"); }
    catch { btn.textContent = "Select"; say("Copy failed; select the text instead"); }
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  };
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener("click", () => copy(btn, btn.getAttribute("data-copy")));
  });
  document.querySelectorAll(".doc pre").forEach((pre) => {
    const wrap = document.createElement("div");
    wrap.className = "pre-wrap";
    pre.replaceWith(wrap);
    wrap.append(pre);
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "copy-btn"; btn.textContent = "Copy";
    btn.addEventListener("click", () => copy(btn, pre.innerText.replace(/\n$/, "")));
    wrap.append(btn);
  });
})();

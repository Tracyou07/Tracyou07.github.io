const viewerState = { frames: 500, view: "cloud" };
const methodNames = { baseline: "VGGT baseline", regime: "RegimeVGGT", asymmetric: "Deep-asymmetric" };
function updateViewer() {
  const { frames, view } = viewerState;
  document.querySelector(".teaser").dataset.view = view;
  document.querySelectorAll("[data-preview]").forEach(image => {
    image.src = `assets/${view}-${image.dataset.preview}-${frames}.webp`;
    image.alt = `${methodNames[image.dataset.preview]} ${view === "cloud" ? "point cloud" : "camera trajectory"} at ${frames} frames`;
  });
  document.querySelectorAll("[data-frames]").forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.frames) === frames)));
  document.querySelectorAll("[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
  document.querySelector("#frame-label").textContent = frames.toLocaleString("en-US");
  document.querySelector("#full-figure-link").href = `assets/${view}-grid.webp`;
  document.querySelector("#viewer-context").textContent = frames === 1000
    ? "At 1,000 frames, all three methods in this example show substantial drift and reconstruction degradation." : "";
}
document.querySelectorAll("[data-frames]").forEach(button => button.addEventListener("click", () => { viewerState.frames = Number(button.dataset.frames); updateViewer(); }));
document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => { viewerState.view = button.dataset.view; updateViewer(); }));
const dialog = document.querySelector("#figure-dialog");
document.querySelectorAll("[data-figure]").forEach(button => button.addEventListener("click", () => {
  document.querySelector("#dialog-image").src = button.dataset.figure;
  document.querySelector("#dialog-image").alt = button.dataset.caption;
  document.querySelector("#dialog-caption").textContent = button.dataset.caption;
  dialog.showModal();
}));
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", event => {
  if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); }
});
document.querySelector("#copy-citation").addEventListener("click", async () => {
  const status = document.querySelector("#copy-status");
  try { await navigator.clipboard.writeText(document.querySelector("#bibtex").textContent); document.querySelector("#copy-citation").textContent = "Copied"; status.textContent = "Citation copied to clipboard."; }
  catch { const range = document.createRange(); range.selectNodeContents(document.querySelector("#bibtex")); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); status.textContent = "Citation selected. Press Ctrl+C or Command+C to copy."; }
});
const sectionObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    document.querySelectorAll(".contents a").forEach(link => { const active = link.getAttribute("href") === `#${entry.target.id}`; link.classList.toggle("active", active); if (active) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current"); });
  }
}, { rootMargin: "-10% 0px -60% 0px" });
document.querySelectorAll(".research-article section").forEach(section => sectionObserver.observe(section));

/* Full-width Market dropdown with market/news tabs and utility actions. */
(function () {
  "use strict";
  function init() {
    var toggle = document.getElementById("library-market-toggle");
    var panel = document.getElementById("library-market-panel");
    var refresh = document.getElementById("library-market-refresh");
    if (!toggle || !panel || toggle.dataset.marketMenuReady === "true") return;
    toggle.dataset.marketMenuReady = "true";
    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.classList.toggle("is-active", open);
    }
    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      setOpen(panel.hidden);
    });
    if (refresh) refresh.addEventListener("click", function () { window.location.reload(); });
    document.addEventListener("click", function (event) {
      if (!panel.hidden && !panel.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) { setOpen(false); toggle.focus(); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

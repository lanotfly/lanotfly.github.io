/* Gesture-driven Market panel: pull down from the top of the page to reveal it. */
(function () {
  "use strict";
  function init() {
    var panel = document.getElementById("library-market-panel");
    var anchor = document.getElementById("library-market-gesture-anchor");
    var refresh = document.getElementById("library-market-refresh");
    if (!panel || !anchor || panel.dataset.marketGestureReady === "true") return;
    panel.dataset.marketGestureReady = "true";
    var startX = 0;
    var startY = 0;
    var tracking = false;
    var threshold = 64;

    function setOpen(open) {
      panel.hidden = !open;
      // A nav tab may have collapsed the inner snapshot; restore it whenever Market opens.
      var snapshot = panel.querySelector(".home-market-panel");
      if (snapshot && open) snapshot.classList.remove("is-collapsed");
      document.documentElement.classList.toggle("market-panel-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
    }

    // Begin a pull only from the top edge of the page, so normal scrolling remains natural.
    document.addEventListener("touchstart", function (event) {
      if (!event.touches || event.touches.length !== 1) return;
      var touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      var panelOpen = !panel.hidden;
      tracking = panelOpen
        ? panel.contains(event.target) && startY > 80
        : window.scrollY <= 2 && startY <= 110;
    }, { passive: true });

    // Prevent iOS Safari's native page pull-to-refresh from cancelling this gesture.
    document.addEventListener("touchmove", function (event) {
      if (!tracking || !event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) * 0.8) {
        tracking = false;
        return;
      }
      if ((panel.hidden && dy > 8 && window.scrollY <= 2) || (!panel.hidden && panel.contains(event.target) && dy < -8)) {
        if (event.cancelable) event.preventDefault();
      }
    }, { passive: false });

    document.addEventListener("touchend", function (event) {
      if (!tracking || !event.changedTouches || !event.changedTouches.length) return;
      tracking = false;
      var touch = event.changedTouches[0];
      var dx = touch.clientX - startX;
      var dy = touch.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) * 0.8) return;
      if (dy >= threshold && panel.hidden && window.scrollY <= 2) setOpen(true);
      else if (dy <= -threshold && !panel.hidden) setOpen(false);
    }, { passive: true });

    // Keyboard users can still open and close the panel without a visible button.
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
      if ((event.altKey || event.metaKey) && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setOpen(panel.hidden);
      }
    });
    if (refresh) refresh.addEventListener("click", function () { window.location.reload(); });
    setOpen(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
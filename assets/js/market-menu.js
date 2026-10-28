/* Swipe down directly on the first navigation row to reveal Market/News. Taps retain their normal behavior. */
(function () {
  "use strict";
  function init() {
    var panel = document.getElementById("library-market-panel");
    var nav = document.querySelector(".site-nav-shell .site-tabs");
    var refresh = document.getElementById("library-market-refresh");
    if (!panel || !nav || panel.dataset.marketGestureReady === "true") return;
    panel.dataset.marketGestureReady = "true";
    var startX = 0, startY = 0, tracking = false, threshold = 64;

    var closeTimer = null;
    function setOpen(open) {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
      if (open) {
        panel.hidden = false;
        panel.classList.remove("is-closing");
        var rect = nav.getBoundingClientRect();
        panel.style.top = Math.max(0, rect.bottom) + "px";
      } else if (!panel.hidden) {
        panel.classList.add("is-closing");
        closeTimer = window.setTimeout(function () {
          if (panel.classList.contains("is-closing")) {
            panel.hidden = true;
            panel.classList.remove("is-closing");
          }
          closeTimer = null;
        }, 185);
      } else {
        panel.hidden = true;
        panel.classList.remove("is-closing");
      }
      var snapshot = panel.querySelector(".home-market-panel");
      if (snapshot && open) snapshot.classList.remove("is-collapsed");
      document.documentElement.classList.toggle("market-panel-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      nav.setAttribute("data-market-panel-open", open ? "true" : "false");
    }

    document.addEventListener("touchstart", function (event) {
      if (!event.touches || event.touches.length !== 1) return;
      var touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = nav.contains(event.target) || (!panel.hidden && panel.contains(event.target));
    }, { passive: true });

    document.addEventListener("touchmove", function (event) {
      if (!tracking || !event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      var dx = touch.clientX - startX, dy = touch.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) * 0.8) { tracking = false; return; }
      if ((panel.hidden && dy > 8) || (!panel.hidden && dy < -8)) {
        if (event.cancelable) event.preventDefault();
      }
    }, { passive: false });

    document.addEventListener("touchend", function (event) {
      if (!tracking || !event.changedTouches || !event.changedTouches.length) return;
      tracking = false;
      var touch = event.changedTouches[0];
      var dx = touch.clientX - startX, dy = touch.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) * 0.8) return;
      if (dy >= threshold && panel.hidden) setOpen(true);
      else if (dy <= -threshold && !panel.hidden) setOpen(false);
    }, { passive: true });

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

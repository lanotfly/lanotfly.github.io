/* Gesture-driven Market panel: swipe down directly on the first navigation row; taps keep their normal behavior. */
(function () {
  "use strict";
  function init() {
    var panel = document.getElementById("library-market-panel");
    var nav = document.querySelector(".site-nav-shell .site-tabs");
    var refresh = document.getElementById("library-market-refresh");
    if (!panel || !nav || panel.dataset.marketGestureReady === "true") return;
    panel.dataset.marketGestureReady = "true";
    var startX = 0, startY = 0, tracking = false, threshold = 64, gestureClaimed = false;

    function setOpen(open) {
      panel.hidden = !open;
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
      gestureClaimed = false;
      var onFirstRow = nav.contains(event.target);
      tracking = !panel.hidden ? (onFirstRow || panel.contains(event.target)) : onFirstRow;
    }, { passive: true });

    document.addEventListener("touchmove", function (event) {
      if (!tracking || !event.touches || !event.touches.length) return;
      var touch = event.touches[0];
      var dx = touch.clientX - startX, dy = touch.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) * 0.8) { tracking = false; return; }
      var opening = panel.hidden && dy > 8;
      var closing = !panel.hidden && dy < -8;
      if (opening || closing) {
        gestureClaimed = true;
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

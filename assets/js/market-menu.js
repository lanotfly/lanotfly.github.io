/* Swipe down directly on the first navigation row to reveal Market/News. Taps retain their normal behavior. */
(function () {
  "use strict";
  function init() {
    var panel = document.getElementById("library-market-panel");
    var nav = document.querySelector(".site-nav-shell .site-tabs");
    if (!panel || !nav || panel.dataset.marketGestureReady === "true") return;
    // Fallback tab switching: keep News usable even if the RSS initializer fails.
    panel.addEventListener("click", function (event) {
      var tab = event.target.closest("[data-home-panel-tab]");
      if (!tab || !panel.contains(tab)) return;
      var id = tab.getAttribute("data-home-panel-tab");
      panel.querySelectorAll("[data-home-panel-tab]").forEach(function (item) {
        var active = item === tab;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-selected", active ? "true" : "false");
      });
      panel.querySelectorAll("[data-home-panel-view]").forEach(function (view) {
        view.hidden = view.getAttribute("data-home-panel-view") !== id;
      });
    });
    panel.dataset.marketGestureReady = "true";
    // Detach the temporary panel from the navigation/layout tree entirely.
    // A fixed overlay living inside a styled wrapper can still inherit odd layout/positioning.
    if (panel.parentElement !== document.body) document.body.appendChild(panel);
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
        var panelTop = 0;
        panel.style.setProperty("top", "8px", "important");
        panel.style.setProperty("left", "5vw", "important");
        panel.style.setProperty("right", "5vw", "important");
        panel.style.setProperty("bottom", "auto", "important");
        panel.style.setProperty("height", "auto", "important");
        panel.style.setProperty("max-height", "calc(100dvh - 5vh - 8px)", "important");
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
      if (!panel.hidden) {
        // Only the outer 15% strips dismiss the overlay. Gestures in the middle
        // are left untouched so the panel's own scroll container can move.
        var inSideStrip = touch.clientX <= window.innerWidth * 0.15 ||
          touch.clientX >= window.innerWidth * 0.85;
        var marketView = panel.querySelector('[data-home-panel-view="market"]');
        var touchingMarketView = !!(marketView && !marketView.hidden && marketView.contains(event.target));
        /* News already dismisses from the edges. Make Market Info equally easy:
           an upward swipe in either side strip or on the visible market view closes it. */
        tracking = panel.contains(event.target) && (inSideStrip || touchingMarketView);
      } else {
        // Open from either screen-edge strip, at any vertical position.
        var inSideStrip = touch.clientX <= window.innerWidth * 0.15 ||
          touch.clientX >= window.innerWidth * 0.85;
        // Edge gestures work from any vertical position, not only the top third.
        tracking = inSideStrip;
      }
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

    // Tapping anywhere outside the open panel dismisses it. The opening
    // swipe is safe: its pointerdown fires while the panel is still hidden.
    document.addEventListener("pointerdown", function (event) {
      if (panel.hidden) return;
      if (panel.contains(event.target)) return;
      setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
      if ((event.altKey || event.metaKey) && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setOpen(panel.hidden);
      }
    });
    setOpen(false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

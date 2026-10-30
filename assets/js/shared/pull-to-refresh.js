/* Pull-to-refresh, owned by the middle of the screen.
   The outer 15% edge strips belong to market-menu.js (they open and close
   the Market/News panel); a downward pull that starts in the middle 70%
   while the page is at the very top shows a hint pill and refreshes the
   page on release. There is no refresh button anymore. */
(function () {
  "use strict";
  if (window.__libraryPullToRefreshInstalled) return;
  window.__libraryPullToRefreshInstalled = true;

  var THRESHOLD = 72;
  var pill = null;
  var startX = 0, startY = 0, tracking = false, armed = false;

  function ensurePill() {
    if (pill) return pill;
    pill = document.createElement("div");
    pill.id = "library-ptr-pill";
    pill.setAttribute("aria-hidden", "true");
    pill.style.cssText = "position:fixed;top:calc(env(safe-area-inset-top, 0px) + 10px);" +
      "left:50%;z-index:100002;padding:8px 16px;border-radius:999px;" +
      "background:rgba(240,248,242,.72);border:1px solid rgba(255,255,255,.6);" +
      "-webkit-backdrop-filter:blur(12px) saturate(150%);backdrop-filter:blur(12px) saturate(150%);" +
      "box-shadow:0 8px 22px rgba(9,50,28,.16);color:#245b39;font-size:13px;font-weight:700;" +
      "letter-spacing:.01em;white-space:nowrap;opacity:0;pointer-events:none;" +
      "transform:translate(-50%,-16px);transition:opacity .18s ease,transform .18s ease";
    document.body.appendChild(pill);
    return pill;
  }
  function showPill(text, dy) {
    var el = ensurePill();
    el.textContent = text;
    el.style.opacity = "1";
    var lift = Math.max(0, Math.min(dy * 0.45, 56) - 16);
    el.style.transform = "translate(-50%, " + lift + "px)";
  }
  function hidePill() {
    if (!pill) return;
    pill.style.opacity = "0";
    pill.style.transform = "translate(-50%, -16px)";
  }
  function panelOpen() {
    var panel = document.getElementById("library-market-panel");
    return !!panel && !panel.hidden;
  }
  function inEdgeStrip(x) {
    return x <= window.innerWidth * 0.15 || x >= window.innerWidth * 0.85;
  }

  document.addEventListener("touchstart", function (event) {
    tracking = false; armed = false;
    if (!event.touches || event.touches.length !== 1) return;
    if (panelOpen()) return;
    if (window.scrollY > 0) return;
    var touch = event.touches[0];
    if (inEdgeStrip(touch.clientX)) return;
    var target = event.target;
    if (target && target.closest && target.closest(
      "button, a, input, select, textarea, audio, #library-market-panel, " +
      ".niv-bible-panel, .podcast-episode-panel, .library-podcast-panel, .radio-source-panel")) return;
    startX = touch.clientX; startY = touch.clientY;
    tracking = true;
  }, { passive: true });

  document.addEventListener("touchmove", function (event) {
    if (!tracking || !event.touches || !event.touches.length) return;
    var touch = event.touches[0];
    var dx = touch.clientX - startX, dy = touch.clientY - startY;
    if (dy <= 0 || Math.abs(dx) > dy * 0.8) { tracking = false; armed = false; hidePill(); return; }
    if (window.scrollY > 0) { tracking = false; armed = false; hidePill(); return; }
    if (dy > 6 && event.cancelable) event.preventDefault();
    armed = dy >= THRESHOLD;
    showPill(armed ? "\u2191 Release to refresh" : "\u2193 Pull to refresh", dy);
  }, { passive: false });

  function finish() {
    if (!tracking) return;
    tracking = false;
    if (armed) {
      armed = false;
      showPill("Refreshing\u2026", THRESHOLD);
      window.setTimeout(function () { window.location.reload(); }, 180);
    } else {
      hidePill();
    }
  }
  document.addEventListener("touchend", finish, { passive: true });
  document.addEventListener("touchcancel", function () {
    tracking = false; armed = false; hidePill();
  }, { passive: true });
})();

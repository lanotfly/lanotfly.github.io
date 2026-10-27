(function () {
  "use strict";
  var key = "yui-library-theme";
  var modes = ["light", "dark"];
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var button;
  function readMode() {
    try {
      var saved = localStorage.getItem(key);
      if (modes.indexOf(saved) >= 0) return saved;
    } catch (error) {}
    return media && media.matches ? "dark" : "light";
  }
  var mode = readMode();

  function applyTheme() {
    var dark = mode === "dark" || (mode === "system" && media && media.matches);
    var theme = dark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    if (document.body) document.body.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#111318" : "#ffffff");
    if (button) {
      button.innerHTML = '<span class="theme-yinyang" aria-hidden="true">☯</span>';
      button.setAttribute("aria-label", "Switch to " + (dark ? "light" : "dark") + " mode");
      button.setAttribute("title", "Switch to " + (dark ? "light" : "dark") + " mode");
      button.setAttribute("aria-pressed", dark ? "true" : "false");
    }
  }

  function saveMode() {
    try { localStorage.setItem(key, mode); } catch (error) {}
    applyTheme();
  }

  function init() {
    button = document.getElementById("site-theme-toggle");
    if (button) {
      button.addEventListener("click", function () {
        mode = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        if (button) {
          var yinYang = button.querySelector(".theme-yinyang");
          if (yinYang) {
            yinYang.classList.remove("is-spinning");
            void yinYang.offsetWidth;
            yinYang.classList.add("is-spinning");
            window.setTimeout(function () { if (yinYang) yinYang.classList.remove("is-spinning"); }, 260);
          }
        }
        saveMode();
      });
      applyTheme();
    }
    if (media) {
      var onSystemChange = function () {
        try { if (!localStorage.getItem(key)) { mode = media.matches ? "dark" : "light"; applyTheme(); } } catch (error) {}
      };
      if (media.addEventListener) media.addEventListener("change", onSystemChange);
      else if (media.addListener) media.addListener(onSystemChange);
    }
  }

  applyTheme();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
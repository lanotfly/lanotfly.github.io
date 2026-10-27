(function () {
  "use strict";
  var key = "yui-library-theme";
  var modes = ["system", "light", "dark"];
  var labels = { system: "System", light: "Light", dark: "Dark" };
  var icons = { system: "◐", light: "☀", dark: "☾" };
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  var button;

  function readMode() {
    try {
      var saved = localStorage.getItem(key);
      return modes.indexOf(saved) >= 0 ? saved : "system";
    } catch (error) {
      return "system";
    }
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
      button.innerHTML = '<span aria-hidden="true">' + icons[mode] + '</span><span>' + labels[mode] + '</span>';
      button.setAttribute("aria-label", "Color theme: " + labels[mode] + ". Activate to change theme.");
      button.setAttribute("title", "Color theme: " + labels[mode] + " (click to change)");
      button.setAttribute("aria-pressed", mode === "dark" ? "true" : "false");
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
        mode = modes[(modes.indexOf(mode) + 1) % modes.length];
        saveMode();
      });
      applyTheme();
    }
    if (media) {
      var onSystemChange = function () { if (mode === "system") applyTheme(); };
      if (media.addEventListener) media.addEventListener("change", onSystemChange);
      else if (media.addListener) media.addListener(onSystemChange);
    }
  }

  applyTheme();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
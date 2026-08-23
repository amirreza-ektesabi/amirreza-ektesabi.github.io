(function () {
  "use strict";

  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyToggleLabel(theme) {
    if (!toggle) return;
    // Button shows the theme it will switch TO.
    toggle.textContent = theme === "dark" ? "[light]" : "[dark]";
    toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
    );
  }

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    applyToggleLabel(theme);
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      /* localStorage unavailable; theme just won't persist */
    }
  }

  // Sync the toggle label with whatever the inline bootstrap script set
  // before this file loaded.
  applyToggleLabel(currentTheme());

  if (toggle) {
    toggle.addEventListener("click", function () {
      setTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }
})();

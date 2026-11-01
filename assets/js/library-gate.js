(() => {
  /* Semi-public library: reading, market and news are open to
     everyone; the AUDIO panel is the owner's private area. An Audio
     press that would open the panel first asks for the passcode in a
     small dialog; the check runs on the library-gate Cloudflare
     Worker (ok / not ok only). A pass is remembered for this browser
     session (sessionStorage), like the old full-page gate. Closing
     the panel never asks. */
  const CHECK_URL = "https://library-gate.lanotfly.workers.dev/check";
  const toggle = document.getElementById("library-audio-toggle");
  const dialog = document.getElementById("library-gate-dialog");
  const form = document.getElementById("library-gate-form");
  const input = document.getElementById("library-gate-passcode");
  const message = document.getElementById("library-gate-message");
  const unlock = document.getElementById("library-gate-unlock");
  const cancel = document.getElementById("library-gate-cancel");

  if (!toggle || !dialog || !form || !input || !message || !unlock || !cancel) return;

  const granted = () => {
    try { return sessionStorage.getItem("library_access_granted") === "1"; }
    catch (_) { return false; }
  };

  function openDialog() {
    message.textContent = "";
    input.value = "";
    dialog.hidden = false;
    setTimeout(() => { try { input.focus(); } catch (_) {} }, 30);
  }
  function closeDialog() { dialog.hidden = true; }

  document.addEventListener("click", (event) => {
    if (granted()) return;
    const target = event.target;
    if (!target || !target.closest || !target.closest("#library-audio-toggle")) return;
    const panel = document.getElementById("library-audio-panel");
    if (panel && !panel.hidden) return; /* already open: this press just closes it */
    event.preventDefault();
    event.stopPropagation();
    openDialog();
  }, true);

  cancel.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.hidden) closeDialog();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    unlock.disabled = true;
    const label = unlock.textContent;
    unlock.textContent = "验证中…";
    try {
      const response = await fetch(CHECK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ passcode: input.value })
      });
      if (!response.ok) throw new Error("The check could not be completed.");
      const result = await response.json();
      if (result && result.ok) {
        try { sessionStorage.setItem("library_access_granted", "1"); } catch (_) {}
        closeDialog();
        toggle.click(); /* unlocked: open the panel like a normal Audio press */
        return;
      }
      input.value = "";
      input.focus();
      message.textContent = "密码不对，再试一次。";
    } catch (error) {
      message.textContent = "验证没成功，请再试一次。";
    } finally {
      unlock.disabled = false;
      unlock.textContent = label;
    }
  });
})();

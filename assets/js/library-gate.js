(() => {
  /* The passcode is checked by a small Cloudflare Worker; the hash no
     longer lives in this repo. The Worker only answers ok / not ok. */
  const CHECK_URL = "https://library-gate.lanotfly.workers.dev/check";
  const form = document.getElementById("library-gate-form");
  const input = document.getElementById("passcode");
  const message = document.getElementById("gate-message");
  const button = document.getElementById("unlock-button");

  if (!form || !input || !message || !button) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    button.disabled = true;
    button.textContent = "Checking…";

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
        let destination = "/home/";
        try {
          sessionStorage.setItem("library_access_granted", "1");
          const queryReturn = new URLSearchParams(window.location.search).get("return_to");
          const savedPath = sessionStorage.getItem("library_return_to");
          const savedAt = Number(sessionStorage.getItem("library_return_to_at") || 0);
          const preferredPath = queryReturn || (savedPath && Date.now() - savedAt < 10 * 60 * 1000 ? savedPath : "");
          if (preferredPath) {
            const candidate = new URL(preferredPath, window.location.origin);
            if (
              candidate.origin === window.location.origin &&
              candidate.pathname.startsWith("/") &&
              candidate.pathname !== "/" &&
              !candidate.pathname.startsWith("//") &&
              !candidate.pathname.startsWith("/?return_to=")
            ) {
              destination = candidate.pathname + candidate.search + candidate.hash;
            }
          }
          sessionStorage.removeItem("library_return_to");
          sessionStorage.removeItem("library_return_to_at");
        } catch (error) {
          message.textContent = "This browser cannot keep the temporary session. Please enable session storage and try again.";
          return;
        }
        message.textContent = "Welcome back. Opening your library…";
        window.location.replace(destination);
        return;
      }

      input.value = "";
      input.focus();
      message.textContent = "That passcode doesn’t match. Please try again.";
    } catch (error) {
      message.textContent = "The check could not be completed. Please try again.";
    } finally {
      button.disabled = false;
      button.textContent = "Unlock library";
    }
  });
})();
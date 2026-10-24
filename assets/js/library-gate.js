(() => {
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
      const response = await fetch("/assets/data/library-passcode.sha256.txt", {
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Could not load passcode data.");

      const expectedHash = (await response.text()).trim().toLowerCase();
      const bytes = new TextEncoder().encode(input.value);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      const actualHash = Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      if (actualHash === expectedHash) {
        try {
          sessionStorage.setItem("library_access_granted", "1");
        } catch (error) {
          message.textContent = "This browser cannot keep the temporary session. Please enable session storage and try again.";
          return;
        }
        message.textContent = "Welcome back. Opening your library…";
        window.location.replace("/home/");
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
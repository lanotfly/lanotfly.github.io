(() => {
  const bar = document.querySelector("[data-fx-bar]");
  if (!bar || bar.dataset.fxInitialized === "true") return;
  bar.dataset.fxInitialized = "true";

  const button = bar.querySelector("[data-fx-refresh]");
  const usdJpyNode = bar.querySelector('[data-fx-value="usd-jpy"]');
  const usdCnyNode = bar.querySelector('[data-fx-value="usd-cny"]');
  const jpyCnyNode = bar.querySelector('[data-fx-value="jpy-cny"]');
  const meta = bar.querySelector("[data-fx-meta]");
  const status = bar.querySelector("[data-fx-status]");
  const cacheKey = "library_fx_rates_v1";
  let activeRequest = null;

  const format = (value, digits) => Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });

  function formatFetchTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "time unavailable";
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(date);
  }

  function showRates(data, cached = false) {
    usdJpyNode.textContent = format(data.usdJpy, 2);
    usdCnyNode.textContent = format(data.usdCny, 4);
    jpyCnyNode.textContent = format(data.jpyCny, 5);
    const date = data.date ? new Date(data.date + "T12:00:00") : new Date();
    const dateLabel = Number.isNaN(date.getTime())
      ? (data.date || "date unavailable")
      : date.toLocaleDateString("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" });
    const fetchedLabel = data.fetchedAt
      ? "Fetched " + formatFetchTime(data.fetchedAt) + " JST"
      : "Fetch time unavailable";
    meta.textContent = (cached ? "Saved · " : "Rate date · ") + dateLabel + " · " + fetchedLabel;
    status.textContent = cached ? "Showing last saved rates." : "Exchange rates updated.";
  }

  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (value && Number.isFinite(value.usdJpy) && Number.isFinite(value.usdCny)) {
        showRates({ ...value, jpyCny: value.usdCny / value.usdJpy }, true);
        return true;
      }
    } catch (_) {}
    return false;
  }

  async function refresh() {
    if (activeRequest) return activeRequest;
    button.disabled = true;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    status.textContent = "Refreshing exchange rates…";
    activeRequest = (async () => {
      try {
        const response = await fetch("https://api.frankfurter.dev/v2/rates?base=USD&quotes=JPY,CNY", {
          cache: "no-store",
          headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error("Exchange rate service returned " + response.status);
        const rows = await response.json();
        const rates = Object.fromEntries(rows.map(row => [String(row.quote).toUpperCase(), Number(row.rate)]));
        const usdJpy = rates.JPY;
        const usdCny = rates.CNY;
        if (!(usdJpy > 0) || !(usdCny > 0)) throw new Error("Required currencies are missing");
        const data = { usdJpy, usdCny, jpyCny: usdCny / usdJpy, date: rows[0]?.date || "", fetchedAt: Date.now() };
        showRates(data);
        try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (_) {}
      } catch (error) {
        const hadCache = readCache();
        status.textContent = hadCache
          ? "Refresh failed. Showing previously saved rates."
          : "Rates unavailable. Tap refresh to try again.";
        if (!hadCache) meta.textContent = "Unable to load rates";
      } finally {
        button.disabled = false;
        button.classList.remove("is-loading");
        button.removeAttribute("aria-busy");
        activeRequest = null;
      }
    })();
    return activeRequest;
  }

  button.addEventListener("click", refresh);
  if (!readCache()) {
    usdJpyNode.textContent = "—";
    usdCnyNode.textContent = "—";
    jpyCnyNode.textContent = "—";
    meta.textContent = "Loading rates…";
  }
  refresh();
  window.addEventListener("pageshow", event => {
    if (event.persisted) refresh();
  });
})();

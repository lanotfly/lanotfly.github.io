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
  const cacheKey = "library_fx_rates_v2";
  const marketCacheKey = "library_market_quotes_v1";
  let activeRequest = null;

  const format = (value, digits = 2) => Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits, maximumFractionDigits: digits
  });
  function formatFetchTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "time unavailable";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(date);
    const part = type => parts.find(item => item.type === type)?.value || "";
    return part("month") + "/" + part("day") + " " + part("hour") + ":" + part("minute");
  }
  function showRates(data, cached = false) {
    usdJpyNode.textContent = format(data.usdJpy, 2);
    usdCnyNode.textContent = format(data.usdCny, 4);
    jpyCnyNode.textContent = format(data.usdCny / data.usdJpy, 5);
    meta.textContent = formatFetchTime(data.fetchedAt);
  }
  function showMarkets(quotes, cached = false) {
    Object.entries(quotes || {}).forEach(([key, item]) => {
      const node = bar.querySelector('[data-market-value="' + key + '"]');
      if (!node || !item || !Number.isFinite(item.price)) return;
      const digits = key === "bitcoin" ? 0 : 2;
      node.textContent = (key === "bitcoin" ? "$" : "") + format(item.price, digits);
      node.title = (item.changePct == null ? "" : ((item.changePct > 0 ? "+" : "") + item.changePct.toFixed(2) + "% · ")) +
        (cached ? "Saved quote" : "Latest available quote");
      node.classList.toggle("is-up", Number(item.changePct) > 0);
      node.classList.toggle("is-down", Number(item.changePct) < 0);
    });
  }
  function readCache() {
    try {
      const data = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (data && Number.isFinite(data.usdJpy) && Number.isFinite(data.usdCny)) { showRates(data, true); return true; }
    } catch (_) {}
    return false;
  }
  function readMarketCache() {
    try {
      const data = JSON.parse(localStorage.getItem(marketCacheKey) || "null");
      if (data && data.quotes) { showMarkets(data.quotes, true); return true; }
    } catch (_) {}
    return false;
  }
  async function fetchMarketQuote(symbol) {
    const yahooUrl = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol) + "?range=1d&interval=1m";
    // Yahoo Finance does not send browser CORS headers; use a lightweight public CORS relay.
    const response = await fetch("https://proxy.cors.dev/" + yahooUrl, { cache: "no-store", credentials: "omit", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("Market quote unavailable: " + symbol);
    const json = await response.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta || {};
    const price = Number(meta.regularMarketPrice);
    const previous = Number(meta.chartPreviousClose || meta.previousClose);
    if (!(price > 0)) throw new Error("Missing market quote: " + symbol);
    return { price, changePct: previous > 0 ? ((price - previous) / previous) * 100 : null, fetchedAt: Date.now() };
  }
  async function refreshMarkets() {
    const instruments = {
      sp500: "^GSPC", nasdaq: "^IXIC", dow: "^DJI",
      shanghai: "000001.SS", nikkei: "^N225", bitcoin: "BTC-USD"
    };
    const entries = await Promise.allSettled(Object.entries(instruments).map(async ([key, symbol]) => [key, await fetchMarketQuote(symbol)]));
    const quotes = {};
    entries.forEach(entry => { if (entry.status === "fulfilled") quotes[entry.value[0]] = entry.value[1]; });
    if (Object.keys(quotes).length) {
      showMarkets(quotes);
      try {
        const old = JSON.parse(localStorage.getItem(marketCacheKey) || '{"quotes":{}}');
        localStorage.setItem(marketCacheKey, JSON.stringify({ quotes: { ...(old.quotes || {}), ...quotes }, fetchedAt: Date.now() }));
      } catch (_) {}
    }
    return Object.keys(quotes).length;
  }
  async function refresh() {
    if (activeRequest) return activeRequest;
    button.disabled = true;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    status.textContent = "Refreshing exchange rates and market quotes…";
    activeRequest = (async () => {
      const tasks = await Promise.allSettled([
        (async () => {
          const response = await fetch("https://api.frankfurter.dev/v2/rates?base=USD&quotes=JPY,CNY", {
            cache: "no-store", headers: { Accept: "application/json" }
          });
          if (!response.ok) throw new Error("Exchange-rate service returned " + response.status);
          const rows = await response.json();
          const rates = Object.fromEntries(rows.map(row => [String(row.quote).toUpperCase(), Number(row.rate)]));
          if (!(rates.JPY > 0) || !(rates.CNY > 0)) throw new Error("Required currencies are missing");
          const data = { usdJpy: rates.JPY, usdCny: rates.CNY, fetchedAt: Date.now() };
          showRates(data);
          try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (_) {}
        })(),
        refreshMarkets()
      ]);
      const rateFailed = tasks[0].status === "rejected";
      const marketFailed = tasks[1].status === "rejected" || tasks[1].value === 0;
      if (rateFailed) readCache();
      if (marketFailed) readMarketCache();
      status.textContent = rateFailed && marketFailed
        ? "Refresh failed. Showing saved data where available."
        : rateFailed || marketFailed
          ? "Some data could not refresh; saved quotes may be shown."
          : "Rates and market quotes updated.";
      if (rateFailed && !readCache()) meta.textContent = "Rates unavailable";
    })().finally(() => {
      button.disabled = false;
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
      activeRequest = null;
    });
    return activeRequest;
  }
  button.addEventListener("click", refresh);
  if (!readCache()) {
    usdJpyNode.textContent = "—"; usdCnyNode.textContent = "—"; jpyCnyNode.textContent = "—";
    meta.textContent = "Loading rates…";
  }
  readMarketCache();
  refresh();
  window.addEventListener("pageshow", event => { if (event.persisted) refresh(); });
})();
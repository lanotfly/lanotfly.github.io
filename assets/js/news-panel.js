/* Independent bilingual RSS news panel; separate from podcast and Bible scripts. */
(function () {
  'use strict';
  if (window.__libraryNewsPanelInstalled) return;
  window.__libraryNewsPanelInstalled = true;
  var feeds = [
    { id: 'english', source: 'The Guardian', url: 'https://www.theguardian.com/international/rss', lang: 'en' },
    { id: 'japanese', source: 'NHK NEWS WEB', url: 'https://www.nhk.or.jp/rss/news/cat0.xml', lang: 'ja' }
  ];
  var cache = {};
  var root = document.getElementById('library-news-panel');
  if (!root) return;
  function clean(value) {
    var box = document.createElement('div');
    box.innerHTML = String(value || '');
    box.querySelectorAll('script,style,iframe,object,embed').forEach(function (node) { node.remove(); });
    return (box.textContent || box.innerText || '').replace(/\s+/g, ' ').trim();
  }
  function xmlItems(xml, feed) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) throw new Error('RSS XML parse error');
    var nodes = Array.prototype.slice.call(doc.getElementsByTagName('item'));
    if (!nodes.length) nodes = Array.prototype.slice.call(doc.getElementsByTagName('entry'));
    var items = nodes.map(function (node) {
      function value(tag) { var found = Array.prototype.slice.call(node.getElementsByTagName('*')).find(function (el) { return (el.localName || el.nodeName.split(':').pop()).toLowerCase() === tag.toLowerCase(); }); return found ? (found.textContent || '').trim() : ''; }
      var link = value('link');
      if (!link) { var linkNode = node.getElementsByTagName('link')[0]; if (linkNode) link = linkNode.getAttribute('href') || ''; }
      return { title: clean(value('title')), summary: clean(value('encoded') || value('content') || value('description') || value('summary')), link: link, date: clean(value('pubDate') || value('published') || value('updated')), source: feed.source };
    }).filter(function (item) { return item.title && /^https?:\/\//i.test(item.link); });
    if (!items.length) throw new Error('RSS feed contained no usable items');
    return items.slice(0, 5);
  }
  function jsonItems(data, feed) {
    if (!data || data.status !== 'ok' || !Array.isArray(data.items)) throw new Error('RSS-to-JSON returned no items');
    var items = data.items.map(function (item) {
      return { title: clean(item.title), summary: clean(item.description || item.content), link: item.link || '', date: clean(item.pubDate), source: feed.source };
    }).filter(function (item) { return item.title && /^https?:\/\//i.test(item.link); }).slice(0, 5);
    if (!items.length) throw new Error('RSS-to-JSON contained no usable items');
    return items;
  }
  function cachedItems(data, feed) {
    if (!data || !Array.isArray(data[feed.id])) throw new Error('No cached news items');
    var items = data[feed.id].map(function (item) {
      return { title: clean(item.title), summary: clean(item.summary || item.description || item.content), link: item.link || '', date: clean(item.date || item.pubDate), source: item.source || feed.source };
    }).filter(function (item) { return item.title && /^https?:\/\//i.test(item.link); }).slice(0, 5);
    if (!items.length) throw new Error('Cached feed is empty');
    return items;
  }
  function getText(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }); }
  function getJson(url) { return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  function fetchFeed(feed) {
    if (cache[feed.id]) return Promise.resolve(cache[feed.id]);
    var encoded = encodeURIComponent(feed.url);
    var attempts = [
      function () { return getJson('/assets/data/news.json?v=20261025-1').then(function (data) { return cachedItems(data, feed); }); },
      function () { return getJson('https://api.rss2json.com/v1/api.json?rss_url=' + encoded).then(function (data) { return jsonItems(data, feed); }); },
      function () { return getText('https://api.allorigins.win/raw?url=' + encoded).then(function (xml) { return xmlItems(xml, feed); }); },
      function () { return getText('https://corsproxy.io/?url=' + encoded).then(function (xml) { return xmlItems(xml, feed); }); }
    ];
    function next(i) { return i >= attempts.length ? Promise.reject(new Error('All RSS providers failed')) : attempts[i]().catch(function () { return next(i + 1); }); }
    return next(0).then(function (items) { cache[feed.id] = items; return items; });
  }
  function makeItem(item, lang) {
    var li = document.createElement('li'); li.className = 'library-news-item';
    var button = document.createElement('button'); button.type = 'button'; button.className = 'library-news-headline'; button.setAttribute('aria-expanded', 'false');
    var title = document.createElement('span'); title.className = 'library-news-headline__title'; title.textContent = item.title;
    var mark = document.createElement('span'); mark.className = 'library-news-chevron'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = '+';
    button.appendChild(title); button.appendChild(mark);
    var detail = document.createElement('div'); detail.className = 'library-news-detail'; detail.hidden = true;
    if (item.date) { var date = document.createElement('p'); date.className = 'library-news-date'; date.textContent = item.date; detail.appendChild(date); }
    var summary = document.createElement('p'); summary.className = 'library-news-summary';
    summary.textContent = item.summary || (lang === 'ja' ? '概要はRSSで配信されていません。' : 'No summary was provided in the RSS feed.');
    detail.appendChild(summary);
    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(open)); detail.hidden = !open; mark.textContent = open ? '−' : '+';
      li.classList.toggle('is-open', open);
    });
    li.appendChild(button); li.appendChild(detail); return li;
  }
  function renderFeed(feed) {
    var list = root.querySelector('[data-news-list="' + feed.id + '"]');
    var status = root.querySelector('[data-news-status="' + feed.id + '"]');
    if (!list || !status) return;
    status.textContent = feed.lang === 'ja' ? 'ニュースを読み込み中…' : 'Loading headlines…'; list.textContent = '';
    fetchFeed(feed).then(function (items) {
      list.textContent = ''; items.forEach(function (item) { list.appendChild(makeItem(item, feed.lang)); });
      status.textContent = feed.lang === 'ja' ? '最新' + items.length + '件 · ' + feed.source : 'Top ' + items.length + ' · ' + feed.source;
    }).catch(function () {
      status.textContent = feed.lang === 'ja' ? 'ニュースを読み込めませんでした。再試行してください。' : 'Could not load news. Please retry.';
      var retry = document.createElement('button'); retry.type = 'button'; retry.className = 'library-news-retry'; retry.textContent = feed.lang === 'ja' ? '再読み込み' : 'Retry';
      retry.addEventListener('click', function () { delete cache[feed.id]; renderFeed(feed); });
      status.appendChild(document.createTextNode(' ')); status.appendChild(retry);
    });
  }
  feeds.forEach(function (feed) {
    var toggle = root.querySelector('[data-news-toggle="' + feed.id + '"]');
    var body = root.querySelector('[data-news-body="' + feed.id + '"]');
    if (toggle && body) toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); body.hidden = !open;
      var mark = toggle.querySelector('.library-news-column__mark'); if (mark) mark.textContent = open ? '−' : '+';
    });
    renderFeed(feed);
  });
})();
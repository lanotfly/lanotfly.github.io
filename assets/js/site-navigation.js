/* Keep the shared navigation and its audio element alive between library pages. */
(function(){
  if (window.__librarySoftNavigationInstalled) return;
  window.__librarySoftNavigationInstalled = true;

  function updatePrimaryActive(pathname){
    var links = document.querySelectorAll('.site-tab-links .site-tab');
    links.forEach(function(link){
      var href = link.getAttribute('href') || '';
      var active = false;
      if (href === '/algorithms/') active = pathname === '/algorithms/' || pathname.indexOf('/algorithms/') === 0;
      else if (href === '/data-structures/ai/') active = pathname === '/data-structures/ai/' || pathname.indexOf('/data-structures/ai/') === 0;
      else if (href === '/data-structures/') active = pathname === '/data-structures/' || (pathname.indexOf('/data-structures/') === 0 && pathname.indexOf('/data-structures/ai/') !== 0);
      else if (href === '/cloud/') active = pathname === '/cloud/' || pathname.indexOf('/cloud/') === 0;
      else if (href === '/linux/') active = pathname === '/linux/' || pathname.indexOf('/linux/') === 0;
      else if (href === '/home/') active = pathname === '/home/' || pathname === '/';
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
        /* Inline important styles make the active state survive page-specific CSS. */
        if (!link.classList.contains('site-tab--radio')) {
          var activePalette = link.classList.contains('site-tab--home') ? ['#54267f','#54267f'] :
            link.classList.contains('site-tab--data') ? ['#1b407d','#1b407d'] :
            link.classList.contains('site-tab--algorithm') ? ['#824306','#824306'] :
            link.classList.contains('site-tab--ai') ? ['#115638','#115638'] :
            link.classList.contains('site-tab--cloud') ? ['#07575d','#07575d'] : ['#46546a','#344052'];
          link.style.setProperty('color', activePalette[0], 'important');
          link.style.setProperty('background-color', 'transparent', 'important');
          link.style.setProperty('border-color', activePalette[1], 'important');
          link.style.setProperty('border-style', 'solid', 'important');
          link.style.setProperty('border-width', '2px', 'important');
          link.style.setProperty('box-shadow', 'none', 'important');
        }
      } else {
        link.removeAttribute('aria-current');
        link.style.removeProperty('color');
        link.style.removeProperty('background-color');
        link.style.removeProperty('border-color');
        link.style.removeProperty('border-style');
        link.style.removeProperty('border-width');
        link.style.removeProperty('box-shadow');
      }
    });
  }
  updatePrimaryActive(window.location.pathname);

  /* Remember the last page visited in each learning area for tab-to-tab switching. */
  var lastPageKeys = {
    data: 'library_last_page_data_structure',
    algorithm: 'library_last_page_algorithm',
    ai: 'library_last_page_ai',
    kubernetes: 'library_last_page_cloud'
  };
  function sectionForPath(pathname){
    if (pathname === '/algorithms/' || pathname.indexOf('/algorithms/') === 0) return 'algorithm';
    if (pathname === '/data-structures/ai/' || pathname.indexOf('/data-structures/ai/') === 0) return 'ai';
    if (pathname === '/cloud/' || pathname.indexOf('/cloud/') === 0) return 'kubernetes';
    if (pathname === '/data-structures/' || pathname.indexOf('/data-structures/') === 0) return 'data';
    return null;
  }
  function rememberPage(pathname){
    var section = sectionForPath(pathname);
    if (!section) return;
    try { localStorage.setItem(lastPageKeys[section], pathname); } catch (_) {}
    try { sessionStorage.setItem(lastPageKeys[section], pathname); } catch (_) {}
  }
  function safeRememberedPage(section){
    var path = null;
    try { path = localStorage.getItem(lastPageKeys[section]); } catch (_) {}
    if (!path) {
      try { path = sessionStorage.getItem(lastPageKeys[section]); } catch (_) {}
    }
    return path && sectionForPath(path) === section ? path : null;
  }
  function resolvePrimaryTab(link, currentPath){
    if (!link || !link.classList) return null;
    var targetSection = link.classList.contains('site-tab--data') ? 'data' :
      (link.classList.contains('site-tab--algorithm') ? 'algorithm' :
      (link.classList.contains('site-tab--ai') ? 'ai' :
      (link.classList.contains('site-tab--cloud') ? 'kubernetes' : null)));
    if (!targetSection) return null;
    var currentSection = sectionForPath(currentPath);
    if (currentSection === targetSection) return currentPath;
    return safeRememberedPage(targetSection) || link.getAttribute('href');
  }
  rememberPage(window.location.pathname);

  function sameOriginPageLink(link){
    if (!link || !link.href || link.target || link.hasAttribute('download')) return false;
    var url;
    try { url = new URL(link.href, window.location.href); } catch (_) { return false; }
    if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return false;
    if (link.getAttribute('rel') === 'external') return false;
    return true;
  }

  function runInsertedScripts(root){
    Array.from(root.querySelectorAll('script')).forEach(function(oldScript){
      var script = document.createElement('script');
      Array.from(oldScript.attributes).forEach(function(attr){ script.setAttribute(attr.name, attr.value); });
      script.textContent = oldScript.textContent;
      oldScript.replaceWith(script);
    });
  }

  async function navigate(url, push){
    var response = await fetch(url.href, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Navigation failed: ' + response.status);
    var doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    var currentInner = document.querySelector('.content-wrapper__inner');
    var nextInner = doc.querySelector('.content-wrapper__inner');
    if (!currentInner || !nextInner) { window.location.href = url.href; return; }

    var currentNav = currentInner.querySelector('.site-nav-shell');
    var nextNav = nextInner.querySelector('.site-nav-shell');
    var currentPodcastPanel = currentInner.querySelector('#podcast-episode-panel');
    var nextPodcastPanel = nextInner.querySelector('#podcast-episode-panel');
    var rules = Array.from(currentInner.children).filter(function(el){ return el.tagName === 'HR'; });
    var nextRules = Array.from(nextInner.children).filter(function(el){ return el.tagName === 'HR'; });
    if (!currentNav || !nextNav || rules.length < 2 || nextRules.length < 2) {
      window.location.href = url.href;
      return;
    }

    var currentTopRule = rules[0];
    var currentBottomRule = rules[rules.length - 1];
    var nextTopRule = nextRules[0];
    var nextBottomRule = nextRules[nextRules.length - 1];
    var newNodes = [];
    var node = nextTopRule.nextSibling;
    while (node && node !== nextBottomRule) {
      /* Keep the shared navigation, audio elements, and podcast panel alive.
         Replacing them during soft navigation leaves playback/listeners attached
         to detached DOM nodes, which can make the episode list appear empty. */
      if (node !== nextNav && node !== nextPodcastPanel) {
        newNodes.push(node.cloneNode(true));
      }
      node = node.nextSibling;
    }

    node = currentTopRule.nextSibling;
    while (node && node !== currentBottomRule) {
      var next = node.nextSibling;
      if (node !== currentNav && node !== currentPodcastPanel) node.remove();
      node = next;
    }
    newNodes.forEach(function(newNode){ currentInner.insertBefore(newNode, currentBottomRule); });

    document.querySelectorAll('link[data-library-page-style="true"]').forEach(function(link){ link.remove(); });
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function(link){
      var href = link.href;
      if (href && href.indexOf(window.location.origin + '/data-structures/wiki.css') === 0) {
        var copy = link.cloneNode(true);
        copy.setAttribute('data-library-page-style', 'true');
        document.head.appendChild(copy);
      }
    });

    document.title = doc.title;
    if (push) history.pushState({ libraryPage: true }, '', url.href);
    updatePrimaryActive(url.pathname);
    rememberPage(url.pathname);
    newNodes.forEach(function(insertedNode){
      if (insertedNode.nodeType !== 1) return;
      if (insertedNode.tagName === 'SCRIPT') {
        var freshScript = document.createElement('script');
        Array.from(insertedNode.attributes).forEach(function(attr){ freshScript.setAttribute(attr.name, attr.value); });
        freshScript.textContent = insertedNode.textContent;
        insertedNode.replaceWith(freshScript);
      } else {
        runInsertedScripts(insertedNode);
      }
    });
    if (url.hash) {
      var target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (target) target.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }

  document.addEventListener('click', function(event){
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target.closest && event.target.closest('a');
    if (!sameOriginPageLink(link)) return;
    /* Save the page being left before resolving the destination tab. */
    rememberPage(window.location.pathname);
    var primaryPath = resolvePrimaryTab(link, window.location.pathname);
    var url = new URL(primaryPath || link.href, window.location.href);
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    navigate(url, true).catch(function(){ window.location.href = url.href; });
  });

  window.addEventListener('popstate', function(){
    navigate(new URL(window.location.href), false).catch(function(){ window.location.reload(); });
  });
})();

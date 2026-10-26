/* Keep the shared navigation and its audio element alive between library pages. */
(function(){
  if (window.__librarySoftNavigationInstalled) return;
  window.__librarySoftNavigationInstalled = true;

  function updatePrimaryActive(pathname){
    var links = document.querySelectorAll('.site-tab-links .site-tab, .book-source-tabs .book-secondary-link');
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
    var bookGroup = document.getElementById('library-book-toggle');
    var bookActive = pathname.indexOf('/data-structures/') === 0 || pathname.indexOf('/algorithms/') === 0 || pathname.indexOf('/linux/') === 0 || pathname.indexOf('/cloud/') === 0;
    if (bookGroup) {
      bookGroup.classList.toggle('is-active', bookActive);
      if (bookActive) bookGroup.style.setProperty('border-style', 'solid', 'important');
      else bookGroup.style.removeProperty('border-style');
    }
  }
  updatePrimaryActive(window.location.pathname);
  /* Let the News overlay temporarily clear the underlying wiki selection. */
  window.LibraryUpdatePrimaryActive = updatePrimaryActive;

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

  var bookSections = [
    {key:'ai', label:'AI', root:'/data-structures/ai/', color:'#18734b'},
    {key:'data', label:'Data', root:'/data-structures/', color:'#18734b'},
    {key:'algorithm', label:'Algorithm', root:'/algorithms/', color:'#18734b'},
    {key:'linux', label:'Linux', root:'/linux/', color:'#18734b'},
    {key:'cloud', label:'Cloud', root:'/cloud/', color:'#18734b'}
  ];
  function bookForPath(pathname){
    for(var i=0;i<bookSections.length;i++){
      var item=bookSections[i];
      if(pathname===item.root || pathname.indexOf(item.root)===0)return item;
    }
    return null;
  }
  function chapterStoreKey(book){return 'library_book_chapters_'+book.key;}
  function collectChapters(book){
    var found=[], seen={};
    document.querySelectorAll('.content-wrapper__inner a[href]').forEach(function(a){
      if(a.closest('.site-nav-shell') || a.classList.contains('book-secondary-link'))return;
      var url;
      try{url=new URL(a.href,window.location.href);}catch(_){return;}
      if(url.origin!==window.location.origin || url.pathname===book.root || url.pathname.indexOf(book.root)!==0)return;
      if(book.key==='data' && url.pathname.indexOf('/data-structures/ai/')===0)return;
      if(book.key==='ai' && url.pathname.indexOf('/data-structures/ai/')!==0)return;
      var label=(a.textContent||a.getAttribute('aria-label')||'').replace(/\s+/g,' ').trim();
      if(!label || label.length>70 || seen[url.pathname])return;
      seen[url.pathname]=true;found.push({label:label,path:url.pathname+url.search+url.hash});
    });
    if(found.length){
      try{localStorage.setItem(chapterStoreKey(book),JSON.stringify(found));}catch(_){}
    }
    return found;
  }
  function renderBookMenu(pathname, level){
    var panel=document.getElementById('library-book-panel');
    if(!panel)return;
    var bookToggle=document.getElementById('library-book-toggle');
    panel.hidden=false;
    if(bookToggle){bookToggle.setAttribute('aria-expanded','true');bookToggle.classList.add('is-open','is-active');}
    var book=bookForPath(pathname);
    var old=panel.querySelector('.book-chapter-tabs');
    if(old)old.remove();
    var second=panel.querySelector('.book-source-tabs');
    if(!second)return;
    if(level!=='3' || !book){second.hidden=false;return;}
    var chapters=collectChapters(book);
    if(!chapters.length){
      try{chapters=JSON.parse(localStorage.getItem(chapterStoreKey(book))||'[]');}catch(_){chapters=[];}
    }
    second.hidden=true;
    panel.hidden=false;
    var bookToggle=document.getElementById('library-book-toggle');
    if(bookToggle){bookToggle.setAttribute('aria-expanded','true');bookToggle.classList.add('is-open','is-active');}
    var nav=document.createElement('nav');
    nav.className='news-secondary-tabs book-chapter-tabs';
    nav.setAttribute('aria-label',book.label+' chapters');
    var badge=document.createElement('span');
    badge.className='book-chapter-book-label';
    badge.textContent=book.label;
    badge.style.setProperty('--book-label-color',book.color);
    nav.appendChild(badge);
    var overview=document.createElement('a');
    overview.className='news-secondary-tab book-chapter-link book-overview-link';
    overview.href=book.root;
    overview.textContent='Overview';
    if(pathname===book.root)overview.classList.add('is-active');
    nav.appendChild(overview);
    chapters.forEach(function(chapter){
      if(chapter.path.split(/[?#]/)[0]===book.root)return;
      var a=document.createElement('a');
      a.className='news-secondary-tab book-chapter-link';
      a.href=chapter.path;
      a.textContent=chapter.label;
      if(pathname===chapter.path.split(/[?#]/)[0])a.classList.add('is-active');
      nav.appendChild(a);
    });
    panel.appendChild(nav);
  }
  document.addEventListener('click',function(event){
    var bookButton=event.target.closest&&event.target.closest('#library-book-toggle');
    if(bookButton){
      var panel=document.getElementById('library-book-panel');
      var second=panel&&panel.querySelector('.book-source-tabs');
      var chapters=panel&&panel.querySelector('.book-chapter-tabs');
      var level='2';
      /* Book is a two-state switch: level 2 -> level 3, level 3 -> level 2.
         If neither menu is currently visible (first open), start at level 2. */
      if(panel&&!panel.hidden){
        if(chapters&&!chapters.hidden) level='2';
        else if(second&&!second.hidden) level='3';
        else { try{level=localStorage.getItem('library_book_level')||'2';}catch(_){} }
      }else{
        /* Reopen the last Book level after an audio panel temporarily hides it. */
        try{level=localStorage.getItem('library_book_level')||'2';}catch(_){}
      }
      try{localStorage.setItem('library_book_level',level);}catch(_){}
      renderBookMenu(window.location.pathname,level);
    }
    var bookLink=event.target.closest&&event.target.closest('.book-secondary-link');
    if(bookLink){try{localStorage.setItem('library_book_level','3');}catch(_){} var targetPath;try{targetPath=new URL(bookLink.href,window.location.href).pathname;}catch(_){} if(targetPath===window.location.pathname)renderBookMenu(window.location.pathname,'3');}
    var chapterLink=event.target.closest&&event.target.closest('.book-chapter-link');
    if(chapterLink){try{localStorage.setItem('library_book_level','3');}catch(_){}}
  },true);
  var initialBookLevel='2'; try{initialBookLevel=localStorage.getItem('library_book_level')||'2';}catch(_){}
  renderBookMenu(window.location.pathname,initialBookLevel);

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
    var currentNewsPanel = currentInner.querySelector('#library-news-panel');
    var nextNewsPanel = nextInner.querySelector('#library-news-panel');
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
      if (node !== nextNav && node !== nextPodcastPanel && node !== nextNewsPanel) {
        newNodes.push(node.cloneNode(true));
      }
      node = node.nextSibling;
    }

    node = currentTopRule.nextSibling;
    while (node && node !== currentBottomRule) {
      var next = node.nextSibling;
      if (node !== currentNav && node !== currentPodcastPanel && node !== currentNewsPanel) node.remove();
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
    var bookLevel='2'; try{bookLevel=localStorage.getItem('library_book_level')||'2';}catch(_){}
    renderBookMenu(url.pathname,bookLevel);
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

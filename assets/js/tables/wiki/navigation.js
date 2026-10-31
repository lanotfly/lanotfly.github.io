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
      else if (href === '/data/ai/') active = pathname === '/data/ai/' || pathname.indexOf('/data/ai/') === 0;
      else if (href === '/data/') active = pathname === '/data/' || (pathname.indexOf('/data/') === 0 && pathname.indexOf('/data/ai/') !== 0);
      else if (href === '/cloud/') active = pathname === '/cloud/' || pathname.indexOf('/cloud/') === 0;
      else if (href === '/linux/') active = pathname === '/linux/' || pathname.indexOf('/linux/') === 0;
      else if (href === '/home/') active = pathname === '/home/' || pathname === '/';
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'page');
        /* Inline important styles make the active state survive page-specific CSS. */
        if (!link.classList.contains('site-tab--radio') && !link.classList.contains('site-tab--home')) {
          var activePalette = ['#18734b','#18734b'];
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
    var navShell = document.querySelector('.site-nav-shell');
    var isHomePath = pathname === '/' || pathname === '/home/';
    if (navShell) {
      navShell.setAttribute('data-active-family', 'reading');
      navShell.setAttribute('data-active-reading-tab', isHomePath ? 'home' : 'reader');
      navShell.removeAttribute('data-active-audio-tab');
    }
  }
  /* Keep every real audio element attached to the document across soft page swaps.
     Audio elements nested in replaceable article/panel markup are otherwise paused by
     Safari when their parent subtree is removed. The player controls continue to find
     them by ID, so a single persistent host outside .content-wrapper__inner is safe. */
  function preserveAudioElements(){
    var host=document.getElementById('library-persistent-audio-host');
    if(!host){
      host=document.createElement('div');
      host.id='library-persistent-audio-host';
      host.setAttribute('aria-hidden','true');
      host.style.cssText='position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);pointer-events:none;opacity:0;';
      document.body.appendChild(host);
    }
    [
      'radio4-audio','nhk-radio-audio','niv-bible-audio',
      'podcast-bbc-audio','podcast-chronicle-audio',
      'podcast-english-audio','podcast-japanese-audio'
    ].forEach(function(id){
      var audio=document.getElementById(id);
      if(audio && audio.parentNode!==host) host.appendChild(audio);
    });
  }
  preserveAudioElements();
  updatePrimaryActive(window.location.pathname);
  /* Let the Podcast overlay temporarily clear the underlying wiki selection. */
  window.LibraryUpdatePrimaryActive = updatePrimaryActive;

  /* Remember the last page visited in each learning area for tab-to-tab switching. */
  var lastPageKeys = {
    data: 'library_last_page_data',
    algorithm: 'library_last_page_algorithm',
    ai: 'library_last_page_ai',
    kubernetes: 'library_last_page_cloud'
  };
  function sectionForPath(pathname){
    if (pathname === '/algorithms/' || pathname.indexOf('/algorithms/') === 0) return 'algorithm';
    if (pathname === '/data/ai/' || pathname.indexOf('/data/ai/') === 0) return 'ai';
    if (pathname === '/cloud/' || pathname.indexOf('/cloud/') === 0) return 'kubernetes';
    if (pathname === '/data/' || pathname.indexOf('/data/') === 0) return 'data';
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
    {key:'ai', label:'AI', root:'/data/ai/', color:'#18734b'},
    {key:'data', label:'Data', root:'/data/', color:'#18734b'},
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
  var closeBookAfterChapterNavigation = false;
  var openBookAfterSecondaryNavigation = false;
  var lastBookMenuLevel = '3';
  try { lastBookMenuLevel = localStorage.getItem('library_book_level') === '2' ? '2' : '3'; } catch (_) {}
  function collectChapters(book){
    /* Data's chapter index is canonical and must not be inferred from prev/next
       links on an individual chapter page. This guarantees the complete list. */
    if(book.key==='data'){
      return [
        {label:'Arrays & Strings',path:'/data/array-string/'},
        {label:'Hash Table — dict & set',path:'/data/hash-table/'},
        {label:'Linked List',path:'/data/linked-list/'},
        {label:'Stack & Queue',path:'/data/stack-queue/'},
        {label:'Tree & Binary Search Tree',path:'/data/tree-bst/'},
        {label:'Heap / Priority Queue',path:'/data/heap/'},
        {label:'Graph',path:'/data/graph/'},
        {label:'Trie (Prefix Tree)',path:'/data/trie/'},
        {label:'Union-Find (Disjoint Set)',path:'/data/union-find/'},
        {label:'Sorting & Binary Search',path:'/data/sorting-binary-search/'}
      ];
    }
    /* Other books may use their cached index links, but never derive a chapter
       menu from the limited prev/next links on an individual article. */
    if(window.location.pathname!==book.root){
      try{
        var cached=JSON.parse(localStorage.getItem(chapterStoreKey(book))||'[]');
        if(Array.isArray(cached)&&cached.length)return cached;
      }catch(_){}
    }
    var found=[], seen={};
    document.querySelectorAll('.content-wrapper__inner a[href]').forEach(function(a){
      if(a.closest('.site-nav-shell') || a.classList.contains('book-secondary-link'))return;
      var url;
      try{url=new URL(a.href,window.location.href);}catch(_){return;}
      if(url.origin!==window.location.origin || url.pathname===book.root || url.pathname.indexOf(book.root)!==0)return;
      if(book.key==='data' && url.pathname.indexOf('/data/ai/')===0)return;
      if(book.key==='ai' && url.pathname.indexOf('/data/ai/')!==0)return;
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
    if(!book && level==='3'){
      var rememberedBookPath=null;
      try{
        var lastMenuPath=localStorage.getItem('library_last_book_menu_path');
        if(lastMenuPath && bookForPath(lastMenuPath)) rememberedBookPath=lastMenuPath;
      }catch(_){}
      rememberedBookPath=rememberedBookPath||safeRememberedPage('data')||safeRememberedPage('ai')||safeRememberedPage('algorithm')||safeRememberedPage('linux')||safeRememberedPage('kubernetes');
      pathname=rememberedBookPath||'/data/';
      book=bookForPath(pathname);
    }
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
    nav.className='secondary-tabs book-chapter-tabs';
    nav.setAttribute('aria-label',book.label+' chapters');
    var badge=document.createElement('span');
    badge.className='book-chapter-book-label';
    badge.textContent=book.label;
    badge.style.setProperty('--book-label-color',book.color);
    nav.appendChild(badge);
    var overview=document.createElement('a');
    overview.className='secondary-tab book-chapter-link book-overview-link';
    overview.href=book.root;
    overview.textContent='Overview';
    if(pathname===book.root)overview.classList.add('is-active');
    nav.appendChild(overview);
    chapters.forEach(function(chapter){
      if(chapter.path.split(/[?#]/)[0]===book.root)return;
      var a=document.createElement('a');
      a.className='secondary-tab book-chapter-link';
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
      /* Book only toggles the compact L2 section picker. Chapter navigation lives in a separate edge-swipe drawer. */
      if(panel && !panel.hidden){
        panel.hidden=true;
        bookButton.setAttribute('aria-expanded','false');
        bookButton.classList.remove('is-open');
      }else{
        lastBookMenuLevel='2';
        try{localStorage.setItem('library_book_level','2');}catch(_){}
        renderBookMenu(window.location.pathname,'2');
      }
    }
    var bookLink=event.target.closest&&event.target.closest('.book-secondary-link');
    if(bookLink){
      openBookAfterSecondaryNavigation=true;
      lastBookMenuLevel='3';
      try{localStorage.setItem('library_book_level','3');}catch(_){}
      /* L2 selection opens that section's L3 menu. */
    }
    var chapterLink=event.target.closest&&event.target.closest('.book-chapter-link');
    if(chapterLink){
      lastBookMenuLevel='3';
      closeBookAfterChapterNavigation=true;
      try{
        localStorage.setItem('library_book_level','3');
        var chapterUrl=new URL(chapterLink.href,window.location.href);
        localStorage.setItem('library_last_book_menu_path',chapterUrl.pathname);
      }catch(_){}
    }
  },true);
  /* Keep Book closed on page load. Its first tap always opens level 2. */
  var initialBookPanel = document.getElementById('library-book-panel');
  var initialBookToggle = document.getElementById('library-book-toggle');
  if (initialBookPanel) initialBookPanel.hidden = true;
  if (initialBookToggle) {
    initialBookToggle.setAttribute('aria-expanded', 'false');
    initialBookToggle.classList.remove('is-open');
  }

  /* Draggable magnetic Book handle opens the chapter drawer; no edge-swipe gesture is used. */
  var chapterDrawer=null, chapterHandle=null, chapterDrawerOpen=false;
  function currentBookPath(){
    var path=window.location.pathname, book=bookForPath(path);
    if(book)return path;
    try{var remembered=localStorage.getItem('library_last_book_menu_path');if(remembered&&bookForPath(remembered))return remembered;}catch(_){}
    return '/data/';
  }
  function closeChapterDrawer(){
    if(!chapterDrawer)return;
    chapterDrawerOpen=false;
    chapterDrawer.classList.remove('is-open');
    chapterDrawer.classList.remove('is-tall');
    chapterDrawer.setAttribute('aria-hidden','true');
    if(chapterHandle){chapterHandle.classList.remove('is-expanded');chapterHandle.setAttribute('aria-expanded','false');}
    document.documentElement.classList.remove('book-chapter-drawer-open');
  }
  function openChapterDrawer(){
    var path=currentBookPath(), book=bookForPath(path);
    if(!book||!chapterDrawer)return;
    var selector=chapterDrawer.querySelector('.book-drawer-book-select');
    if(selector){
      selector.replaceChildren();
      bookSections.forEach(function(item){
        var option=document.createElement('option');option.value=item.key;option.textContent=item.label;
        selector.appendChild(option);
      });
      selector.value=book.key;
      if(window.LibrarySyncCustomSelects)window.LibrarySyncCustomSelects();
    }
    var themeToggle=chapterDrawer.querySelector('.book-drawer-theme-toggle');
    if(themeToggle){var isDark=document.documentElement.getAttribute('data-theme')==='dark';themeToggle.setAttribute('aria-pressed',isDark?'true':'false');themeToggle.setAttribute('aria-label','Switch to '+(isDark?'light':'dark')+' mode');var themeLabel=themeToggle.querySelector('.theme-toggle-label');if(themeLabel)themeLabel.textContent=isDark?'Light mode':'Dark mode';}
    chapterDrawer.dataset.side=chapterHandle.dataset.side||'right';
    positionChapterDrawer();
    var list=chapterDrawer.querySelector('.book-drawer-list');
    list.replaceChildren();
    var overview=document.createElement('a');overview.className='book-drawer-link';overview.href=book.root;overview.textContent='Overview';
    if(path===book.root)overview.classList.add('is-current');
    list.appendChild(overview);
    collectChapters(book).forEach(function(chapter){
      if(chapter.path.split(/[?#]/)[0]===book.root)return;
      var a=document.createElement('a');a.className='book-drawer-link';a.href=chapter.path;a.textContent=chapter.label;
      if(path===chapter.path.split(/[?#]/)[0])a.classList.add('is-current');
      list.appendChild(a);
    });
    chapterDrawerOpen=true;chapterDrawer.classList.add('is-open');chapterDrawer.setAttribute('aria-hidden','false');
    chapterHandle.classList.add('is-expanded');chapterHandle.setAttribute('aria-expanded','true');
    document.documentElement.classList.add('book-chapter-drawer-open');
  }
  function positionChapterDrawer(){
    if(!chapterHandle||!chapterDrawer)return;
    var r=chapterHandle.getBoundingClientRect();
    var gap=0;
    chapterDrawer.style.bottom='auto';
    /* Align the drawer's top edge with the floating Reading handle's top edge. */
    var top=Math.max(8,Math.min(window.innerHeight-264,r.top));
    chapterDrawer.style.top=top+'px';
    chapterDrawer.style.maxHeight=Math.max(200,window.innerHeight-top-12)+'px';
    /* The chapter list flexes with the room below the handle: up to five
       chapters near the top of the screen, shrinking to a three-chapter
       minimum as the handle is dragged down. */
    var list=chapterDrawer.querySelector('.book-drawer-list');
    if(list){
      var fixed=28;
      Array.prototype.forEach.call(chapterDrawer.children,function(child){if(child!==list)fixed+=child.offsetHeight+10;});
      var avail=window.innerHeight-top-12-fixed;
      list.style.maxHeight=Math.max(124,Math.min(218,avail))+'px';
    }
  }
  function moveHandleTo(top){
    if(!chapterHandle)return;
    /* Dragging up is unlimited; dragging down stops where the drawer still
       fits with its chapter list shrunk to the 3-chapter minimum (~264px). */
    var minTop=8;
    var maxTop=Math.max(minTop,window.innerHeight-264);
    var next=Math.max(minTop,Math.min(maxTop,top));
    chapterHandle.style.top=next+'px';chapterHandle.style.transform='none';
    if(chapterDrawerOpen)positionChapterDrawer();
  }
  function placeChapterHandle(side){
    if(!chapterHandle)return;
    chapterHandle.dataset.side=side;
    chapterHandle.style.left=side==='left'?'0':'auto';
    chapterHandle.style.right=side==='right'?'0':'auto';
    chapterDrawer.dataset.side=side;
    try{localStorage.setItem('library_book_handle_side',side);}catch(_){}
  }
  function initChapterDrawer(){
    if(chapterDrawer)return;
    if(!document.querySelector('link[data-book-handle-css]')){var bookCss=document.createElement('link');bookCss.rel='stylesheet';bookCss.href='/assets/css/book-chapter-handle.css?v=20261031-3';bookCss.setAttribute('data-book-handle-css','');document.head.appendChild(bookCss);}
    chapterDrawer=document.createElement('aside');
    chapterDrawer.id='library-book-chapter-drawer';chapterDrawer.setAttribute('aria-hidden','true');
    chapterDrawer.addEventListener('click',function(event){
      /* Tapping the drawer's upper area (not the list, not a control)
         stretches the chapter list to the bottom of the screen;
         tapping again returns to the five-chapter size. */
      if(event.target.closest('.book-drawer-list, button, select, a, .lx-select'))return;
      chapterDrawer.classList.toggle('is-tall');
    });
    chapterDrawer.innerHTML='<div class="book-drawer-book-label">Book</div><div class="book-drawer-book-row"><select class="book-drawer-book-select" aria-label="Choose a book"></select><button type="button" class="book-drawer-theme-toggle" id="site-theme-toggle" aria-pressed="false" aria-label="Switch to dark mode"><span class="theme-toggle-label">Dark mode</span></button></div><div class="book-drawer-section-label">Chapters</div><nav class="book-drawer-list" aria-label="Book chapter list"></nav>';
    chapterHandle=document.createElement('button');chapterHandle.type='button';chapterHandle.id='library-book-chapter-handle';
    chapterHandle.setAttribute('aria-label','Open reading navigation');chapterHandle.setAttribute('aria-expanded','false');
    chapterHandle.innerHTML='<span class="book-handle-grip" aria-hidden="true">⠿</span><span class="book-handle-label">Reading</span><span class="book-handle-chevron" aria-hidden="true">‹</span>';
    document.body.appendChild(chapterDrawer);document.body.appendChild(chapterHandle);
    var side='right';try{side=localStorage.getItem('library_book_handle_side')||'right';}catch(_){}
    placeChapterHandle(side);
    try{var savedTop=localStorage.getItem('library_book_handle_top');if(savedTop){moveHandleTo(parseFloat(savedTop));}}catch(_){}
    chapterHandle.addEventListener('click',function(){if(chapterHandle.dataset.dragged==='1'){chapterHandle.dataset.dragged='0';return;}if(chapterDrawerOpen)closeChapterDrawer();else openChapterDrawer();});
    if(window.LibraryEnhanceSelect)window.LibraryEnhanceSelect(chapterDrawer.querySelector('.book-drawer-book-select'),{variant:'book',buttonClass:'book-drawer-book-select'});
    chapterDrawer.querySelector('.book-drawer-book-select').addEventListener('change',function(){
      var selected=bookSections.find(function(item){return item.key===this.value;},this);
      if(!selected)return;
      var remembered=safeRememberedPage(selected.key==='cloud'?'kubernetes':selected.key);
      var target=new URL(remembered||selected.root,window.location.href);
      navigate(target,true).then(function(){openChapterDrawer();}).catch(function(){window.location.href=target.href;});
    });
    window.addEventListener('resize',function(){if(chapterHandle){moveHandleTo(chapterHandle.getBoundingClientRect().top);if(chapterDrawerOpen)positionChapterDrawer();}});
    document.addEventListener('pointerdown',function(e){
      if(!chapterDrawerOpen)return;
      if(chapterDrawer.contains(e.target)||chapterHandle.contains(e.target))return;
      closeChapterDrawer();
    },true);
    chapterDrawer.addEventListener('pointerdown',function(e){
      if(e.target.closest('a,select,label'))return;
      var sy=e.clientY, base=chapterHandle.getBoundingClientRect().top, moved=false;
      function onMove(ev){var dy=ev.clientY-sy;if(Math.abs(dy)>5)moved=true;if(moved)moveHandleTo(base+dy);}
      function onUp(){document.removeEventListener('pointermove',onMove);document.removeEventListener('pointerup',onUp);if(moved){try{localStorage.setItem('library_book_handle_top',chapterHandle.style.top);}catch(_){}}}
      document.addEventListener('pointermove',onMove);document.addEventListener('pointerup',onUp,{once:true});
    });
    chapterDrawer.addEventListener('click',function(e){
      var link=e.target.closest('a.book-drawer-link');
      if(link){try{localStorage.setItem('library_last_book_menu_path',new URL(link.href,window.location.href).pathname);}catch(_){}closeChapterDrawer();}
    });
    var sy=0,baseTop=0,dragging=false,moved=false;
    chapterHandle.addEventListener('pointerdown',function(e){
      if(e.button!==undefined&&e.button!==0)return;
      dragging=true;moved=false;sy=e.clientY;
      var rect=chapterHandle.getBoundingClientRect();baseTop=rect.top;
      chapterHandle.setPointerCapture&&chapterHandle.setPointerCapture(e.pointerId);
    });
    chapterHandle.addEventListener('pointermove',function(e){
      if(!dragging)return;
      var dy=e.clientY-sy;
      if(Math.abs(dy)>7)moved=true;
      if(!moved)return;
      chapterHandle.style.transition='none';
      var nextTop=Math.max(12,Math.min(window.innerHeight-chapterHandle.offsetHeight-12,baseTop+dy));
      moveHandleTo(nextTop);
    });
    function finishDrag(){
      if(!dragging)return;dragging=false;
      if(moved){
        var rect=chapterHandle.getBoundingClientRect();
        moveHandleTo(rect.top);
        try{localStorage.setItem('library_book_handle_top',chapterHandle.style.top);}catch(_){}
        chapterHandle.style.transition='';
        chapterHandle.dataset.dragged='1';
        window.setTimeout(function(){chapterHandle.dataset.dragged='0';},250);
      }
    }
    chapterHandle.addEventListener('pointerup',finishDrag);
    chapterHandle.addEventListener('pointercancel',finishDrag);
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeChapterDrawer();});
    function updateHandleVisibility(){
      /* The floating Reading entry replaces the removed top-level Book tab,
         so it must remain reachable from Home and audio pages as well. */
      chapterHandle.hidden=false;
    }
    updateHandleVisibility();
    window.addEventListener('popstate',updateHandleVisibility);
  }
  initChapterDrawer();

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
    /* Reader navigation is not an audio action. Do not snapshot, pause, or resume playback here.
       Audio source switching and pause/resume belong exclusively to the audio controls/coordinator. */
    var response = await fetch(url.href, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('Navigation failed: ' + response.status);
    var doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    var currentInner = document.querySelector('.content-wrapper__inner');
    var nextInner = doc.querySelector('.content-wrapper__inner');
    if (!currentInner || !nextInner) { window.location.href = url.href; return; }

    var currentNav = currentInner.querySelector('.site-nav-shell');
    var nextNav = nextInner.querySelector('.site-nav-shell');
    var currentBookPanel = currentInner.querySelector('#library-book-panel');
    var wasBookPanelOpen = !!(currentBookPanel && !currentBookPanel.hidden);
    var currentPodcastEpisodePanel = currentInner.querySelector('#podcast-episode-panel');
    var nextPodcastEpisodePanel = nextInner.querySelector('#podcast-episode-panel');
    var currentPodcastPanel = currentInner.querySelector('#library-podcast-panel');
    var nextPodcastPanel = nextInner.querySelector('#library-podcast-panel');
    var currentKjvPanel = currentInner.querySelector('#niv-bible-panel');
    var nextKjvPanel = nextInner.querySelector('#niv-bible-panel');
    if (!currentNav || !nextNav) {
      /* A page without the shared shell is not safe to swap in place. */
      throw new Error('Shared navigation shell missing');
    }
    var newNodes = [];
    /* Always replace page content structurally instead of relying on HR markers.
       Home and chapter pages do not have a guaranteed number of HR elements.
       Preserve the shared navigation, audio panels and footer so reader-only
       navigation never causes a full document reload that interrupts playback. */
    var keepCurrent = [currentNav, currentPodcastEpisodePanel, currentPodcastPanel, currentKjvPanel].filter(Boolean);
    var keepNext = [nextNav, nextPodcastEpisodePanel, nextPodcastPanel, nextKjvPanel].filter(Boolean);
    Array.from(nextInner.childNodes).forEach(function(child){
      if (keepNext.indexOf(child) < 0 && !(child.nodeType === 1 && child.matches('.footer, .footer *'))) {
        newNodes.push(child.cloneNode(true));
      }
    });
    Array.from(currentInner.childNodes).forEach(function(child){
      if (keepCurrent.indexOf(child) < 0 && !(child.nodeType === 1 && child.matches('.footer, .footer *'))) child.remove();
    });
    var footer = currentInner.querySelector(':scope > .footer');
    newNodes.forEach(function(newNode){ currentInner.insertBefore(newNode, footer || null); });

    document.querySelectorAll('link[data-library-page-style="true"]').forEach(function(link){ link.remove(); });
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function(link){
      var href = link.href;
      if (href && href.indexOf(window.location.origin + '/data/wiki.css') === 0) {
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
    var bookPanelAfterNav=document.getElementById('library-book-panel');
    var bookToggleAfterNav=document.getElementById('library-book-toggle');
    var isHomeDestination=url.pathname==='/'||url.pathname==='/home/';
    if(closeBookAfterChapterNavigation){
      /* A chosen L3 chapter is the final destination: hide temporary menus and leave the article visible. */
      closeBookAfterChapterNavigation=false;
      lastBookMenuLevel='3';
      try{localStorage.setItem('library_book_level','3');}catch(_){}
      if(bookPanelAfterNav)bookPanelAfterNav.hidden=true;
      if(bookToggleAfterNav){bookToggleAfterNav.setAttribute('aria-expanded','false');bookToggleAfterNav.classList.remove('is-open');}
    }else if(openBookAfterSecondaryNavigation&&!isHomeDestination){
      openBookAfterSecondaryNavigation=false;
      lastBookMenuLevel='2';
      try{localStorage.setItem('library_book_level','2');}catch(_){}
      if(bookPanelAfterNav)bookPanelAfterNav.hidden=true;
      if(bookToggleAfterNav){bookToggleAfterNav.setAttribute('aria-expanded','false');bookToggleAfterNav.classList.remove('is-open');}
    }else if(wasBookPanelOpen&&!isHomeDestination){
      renderBookMenu(url.pathname,'2');
    }else{
      if(bookPanelAfterNav)bookPanelAfterNav.hidden=true;
      if(bookToggleAfterNav){
        bookToggleAfterNav.setAttribute('aria-expanded','false');
        bookToggleAfterNav.classList.remove('is-open');
      }
    }
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
    /* Intentionally no playback restoration here. Persistent audio elements remain the same
       objects; re-calling play() during a reader-only transition can itself interrupt state. */
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
    var targetHref = primaryPath || link.href;
    if(link.classList.contains('book-secondary-link')){
      var targetBook=bookForPath(link.pathname||new URL(link.href,window.location.href).pathname);
      if(targetBook){
        var rememberedTarget=safeRememberedPage(targetBook.key==='algorithm'?'algorithm':targetBook.key==='ai'?'ai':targetBook.key==='cloud'?'kubernetes':targetBook.key==='linux'?'data':'data');
        /* Linux and Cloud currently share their own roots; use the section-specific remembered URL when available. */
        if(targetBook.key==='linux'){try{rememberedTarget=localStorage.getItem('library_last_page_linux')||null;}catch(_){} if(!rememberedTarget)rememberedTarget=targetBook.root;}
        if(targetBook.key==='cloud'){try{rememberedTarget=localStorage.getItem('library_last_page_cloud')||null;}catch(_){} if(!rememberedTarget)rememberedTarget=targetBook.root;}
        targetHref=rememberedTarget||targetBook.root;
      }
    }
    var url = new URL(targetHref, window.location.href);
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) {
      event.preventDefault();
      if(link.classList.contains('book-chapter-link')){
        closeBookAfterChapterNavigation=false;
        lastBookMenuLevel='3';
        try{localStorage.setItem('library_book_level','3');localStorage.setItem('library_last_book_menu_path',url.pathname);}catch(_){}
        var samePathPanel=document.getElementById('library-book-panel');
        var samePathToggle=document.getElementById('library-book-toggle');
        if(samePathPanel)samePathPanel.hidden=true;
        if(samePathToggle){samePathToggle.setAttribute('aria-expanded','false');samePathToggle.classList.remove('is-open','is-active');}
      }
      return;
    }
    event.preventDefault();
    navigate(url, true).catch(function(){ window.location.href = url.href; });
  });

  window.addEventListener('popstate', function(){
    navigate(new URL(window.location.href), false).catch(function(){ window.location.reload(); });
  });
})();

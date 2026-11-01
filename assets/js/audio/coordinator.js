(function(window,document){
  'use strict';
  if(window.LibraryAudioCoordinator)return;
  var audioIds={radio4:'radio4-audio',nhk:'nhk-radio-audio',npr:'npr-radio-audio',bible:'niv-bible-audio',podcastBbc:'podcast-bbc-audio',podcastChronicle:'podcast-chronicle-audio',podcastEnglish:'podcast-english-audio',podcastJapanese:'podcast-japanese-audio'};
  function getAudio(name){return document.getElementById(audioIds[name]);}
  var buttonsBySource={radio4:['radio4-toggle'],nhk:['nhk-radio-toggle'],npr:['npr-radio-toggle'],bible:['niv-bible-toggle']};
  var activeTarget=null;
  var radioToggle=document.getElementById('library-radio-toggle');
  var radioPanel=document.getElementById('library-radio-panel');
  var lastRadio='radio4';
  try{var savedRadio=localStorage.getItem('library_last_radio_station');lastRadio=(savedRadio==='nhk'||savedRadio==='npr')?savedRadio:'radio4';}catch(_){}
  function clearButtonState(button){
    if(!button)return;
    button.setAttribute('aria-pressed','false');
    button.classList.remove('is-playing','is-selected');
    if(button.id==='radio4-toggle') ['background-color','color','border-color','border-style','box-shadow'].forEach(function(p){button.style.removeProperty(p);});
  }
  function rememberRadio(target){
    if(target!=='radio4'&&target!=='nhk'&&target!=='npr')return;
    lastRadio=target;
    try{localStorage.setItem('library_last_radio_station',target);}catch(_){}
  }
  function closeRadioPanel(){
    if(!radioToggle||!radioPanel)return;
    radioToggle.setAttribute('aria-expanded','false');radioToggle.classList.remove('is-open','is-active');radioPanel.hidden=true;
  }
  function switchTo(target){
    activeTarget=target;
    if(target==='radio4'||target==='nhk'||target==='npr')rememberRadio(target);
    Object.keys(buttonsBySource).forEach(function(source){if(source!==target)buttonsBySource[source].forEach(function(id){clearButtonState(document.getElementById(id));});});
    var targetAudio=null;
    if(target.indexOf('podcast:')===0)targetAudio=document.getElementById('podcast-'+target.slice(8)+'-audio');
    Object.keys(audioIds).forEach(function(name){
      if(name===target)return;
      if(target==='podcast'&&name.indexOf('podcast')===0)return;
      var audio=getAudio(name);
      /* Never pause the target's own element: for 'podcast:<feed>'
         targets the name never equals the target string, so the
         resume path used to pause the very audio it was about to
         play — a pause/play pair in one task, exactly the pattern
         iOS drops while a play is pending. */
      if(audio&&audio!==targetAudio&&!audio.paused){try{audio.pause();}catch(_){}}
    });
    if(target!=='bible'){var bb=document.getElementById('niv-bible-toggle');if(bb)bb.setAttribute('aria-expanded','false');}
    if(target==='bible'){var bt=document.getElementById('niv-bible-toggle');if(bt)bt.setAttribute('aria-expanded','true');}
    return true;
  }
  function setRadioPanelOpen(open){
    if(!radioToggle||!radioPanel)return;
    if(!open){closeRadioPanel();return;}
    var podcastToggle=document.getElementById('library-podcast-toggle');if(podcastToggle&&podcastToggle.getAttribute('aria-expanded')==='true'&&typeof window.LibraryClosePodcastPanel==='function')window.LibraryClosePodcastPanel();
    var biblePanel=document.getElementById('niv-bible-panel'),bibleButton=document.getElementById('niv-bible-toggle');
    if(biblePanel)biblePanel.hidden=true;if(bibleButton)bibleButton.setAttribute('aria-expanded','false');
    radioToggle.setAttribute('aria-expanded','true');radioToggle.classList.add('is-open','is-active');radioPanel.hidden=false;
    var station=getAudio(lastRadio)||getAudio('radio4');
    if(station&&station.paused){
      switchTo(lastRadio);
      var result=station.play();
      if(result&&result.catch)result.catch(function(){/* If autoplay is blocked, the station button remains available for a direct tap. */});
    }
  }
  if(radioToggle&&radioPanel)radioToggle.addEventListener('click',function(){
    /* Keep Radio's station row visible; repeated taps pause/resume the selected station. */
    if(radioToggle.getAttribute('aria-expanded')==='true'){
      var station=getAudio(lastRadio)||getAudio('radio4');
      if(station&&!station.paused){station.pause();return;}
    }
    setRadioPanelOpen(true);
  });
  document.addEventListener('click',function(event){
    var target=event.target&&event.target.closest&&event.target.closest('#library-podcast-toggle,#niv-bible-toggle');
    if(target)closeRadioPanel();
  },true);
  /* Navigation colors are owned exclusively by shared/nav-tab-state.js.
     This coordinator owns audio source switching and audio-panel behavior only. */
  window.LibraryAudioCoordinator={switchTo:switchTo,getAudio:getAudio,getActiveTarget:function(){return activeTarget;},setRadioPanelOpen:setRadioPanelOpen,getLastRadio:function(){return lastRadio;}};
  window.__prepareRadioPlayback=function(target){switchTo(target||lastRadio||'radio4');};
})(window,document);
/* Audio shell: one row of three split buttons — Radio | KJV | Podcast.
   Each main button plays/pauses its source (radio: last station, BBC the
   first time; KJV: resumes sequential chapter playback; podcast: the
   selected feed, BBC Global News by default). Each side button opens a
   chooser in the ONE shared list area below: the station strip, the
   book/chapter drawer, or — for podcasts — a small feed menu, after
   which the chosen feed's episodes fill the list area. The podcast
   source tabs are hidden (CSS) and driven through this menu. */
(function(window,document){
  'use strict';
  var shellToggle=document.getElementById('library-audio-toggle');
  var shell=document.getElementById('library-audio-panel');
  if(!shellToggle||!shell)return;
  var PLAY='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.8 6.2v11.6c0 .8.9 1.3 1.6.9l9-5.8c.6-.4.6-1.4 0-1.8l-9-5.8c-.7-.4-1.6.1-1.6.9z" fill="currentColor"/></svg>';
  var PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.5 6h3.2v12H7.5zM13.3 6h3.2v12h-3.2z" fill="currentColor"/></svg>';
  var radioPanel=document.getElementById('library-radio-panel');
  var podRoot=document.getElementById('library-podcast-panel');
  var mode='podcast';
  function applyMode(){
    if(podRoot){
      if(mode==='podcast'&&podRoot.hidden&&typeof window.LibraryOpenPodcastPanel==='function')window.LibraryOpenPodcastPanel();
      if(mode!=='podcast'&&!podRoot.hidden&&typeof window.LibraryClosePodcastPanel==='function')window.LibraryClosePodcastPanel();
    }
  }
  function applyStoredFeed(){
    try{
      if(localStorage.getItem('personal-library-podcast-active-feed')!=='kjv')return;
      var tab=document.querySelector('[data-podcast-tab="kjv"]');
      var sel=document.querySelector('[data-podcast-tab][aria-selected="true"]');
      if(tab&&(!sel||sel.getAttribute('data-podcast-tab')!=='kjv'))tab.click();
    }catch(_){}
  }
  function setMode(next){mode=next;applyMode();}
  function setShell(open){
    shell.hidden=!open;
    shellToggle.setAttribute('aria-expanded',String(open));
    shellToggle.classList.toggle('is-open',open);
    shellToggle.classList.toggle('is-active',open);
    if(open){applyMode();applyStoredFeed();}else{closeFeedMenu();closeStationMenu();}
  }
  function ensurePodcastStarted(){
    var C=window.LibraryAudioCoordinator;if(!C)return;
    var names=['podcastBbc','podcastChronicle','podcastEnglish','podcastJapanese','bible','radio4','nhk','npr'];
    var anyPlaying=names.some(function(name){var a=C.getAudio(name);return a&&!a.paused&&!a.ended;});
    if(anyPlaying)return;
    var feed='bbc';
    try{feed=localStorage.getItem('personal-library-podcast-active-feed')||'bbc';}catch(_){}
    if(feed==='kjv'){var bb=document.getElementById('niv-bible-toggle');if(bb)bb.click();return;}
    if(['bbc','chronicle','english','japanese'].indexOf(feed)<0)feed='bbc';
    var pt=document.getElementById('library-podcast-toggle');if(pt)pt.click();
  }
  shellToggle.addEventListener('click',function(){ensurePodcastStarted();setShell(shell.hidden);});
  function paintGlyph(btn,playing){
    if(!btn)return;
    btn.classList.toggle('is-playing',playing);
    var g=btn.querySelector('[data-glyph]');if(g)g.innerHTML=playing?PAUSE:PLAY;
  }
  /* iOS only treats audio as background-worthy when playback traces
     back to a real finger gesture. The 300ms tap model fires the real
     play() from a timer, after the gesture has ended — so bless the
     element inside the genuine pointerdown instead: a play() that is
     paused again a tick later makes no sound, but marks the element
     as gesture-started, and the later play() inherits that standing
     for background / lock-screen playback. The pause must NOT land
     in the play's own task (see below). */
  function primeForBackground(a){
    /* DISABLED 2026-11-01 (experiment): the gesture prime is removed.
       On the user's iPhone, a Podcast/Radio resume tap kept flipping
       straight back to pause with the prime active — its play() takes
       effect late on iOS and every counter-pause scheme (same-task,
       next-task, guarded) failed to tame it there, while desktop
       rigs pass either way. Background continuation does not depend
       on the prime: the fix the user confirmed on-device is panel.js
       advancing to the next episode before the current one ends.
       If resume works without the prime, it stays out. */
    return;
  }
  /* Radio */
  var radioPlay=document.getElementById('audio-radio-play');
  /* Lock-screen prev/next for radio: cycle BBC > NHK > NPR and back,
     the station-menu order (so BBC's next is NHK, its previous wraps
     to NPR). Registered lazily from paintRadio because identity.js
     loads after this file; the flag makes it one-time. */
  var radioTransportReady=false;
  function ensureRadioTransport(){
    if(radioTransportReady)return;
    var I=window.LibraryAudioIdentity;
    if(!I||typeof I.setTransport!=='function')return;
    radioTransportReady=true;
    var order=['radio4','nhk','npr'];
    function cycle(step){
      var C=window.LibraryAudioCoordinator;if(!C)return;
      var i=order.indexOf(C.getLastRadio());if(i<0)i=0;
      var target=order[(i+step+order.length)%order.length];
      var a=C.getAudio(target);if(!a)return;
      if(a.paused){C.switchTo(target);var r=a.play();if(r&&r.catch)r.catch(function(){});}
    }
    order.forEach(function(id){I.setTransport(id,{previous:function(){cycle(-1);},next:function(){cycle(1);}});});
  }
  function paintRadio(){
    ensureRadioTransport();
    var C=window.LibraryAudioCoordinator;var playing=false;var station='radio4';
    if(C){station=C.getLastRadio();var a=C.getAudio(station);playing=!!(a&&!a.paused);}
    paintGlyph(radioPlay,playing);
    /* The button names the selected station: Radio BBC / NHK / NPR. */
    if(radioPlay){
      var suffix=station==='nhk'?'NHK':station==='npr'?'NPR':'BBC';
      var label=radioPlay.querySelector('[data-label]');
      if(label)label.textContent='Radio '+suffix;
      radioPlay.setAttribute('aria-label','Play or pause Radio '+suffix);
    }
  }
  var radioLongPressed=false;
  if(radioPlay)radioPlay.addEventListener('click',function(){
    if(radioLongPressed){radioLongPressed=false;return;}
    var C=window.LibraryAudioCoordinator;if(!C)return;
    var target=C.getLastRadio();var a=C.getAudio(target);if(!a)return;
    var intent=radioPlay.__armedIntent;radioPlay.__armedIntent=null;
    var playing=(intent&&intent.target===target)?!intent.wasPaused:!a.paused;
    if(playing){a.pause();return;}
    C.switchTo(target);
    var r=a.play();if(r&&r.catch)r.catch(function(){});
  });
  ['radio4-audio','nhk-radio-audio','npr-radio-audio'].forEach(function(id){
    var a=document.getElementById(id);
    if(a){a.addEventListener('play',paintRadio);a.addEventListener('pause',paintRadio);a.addEventListener('ended',paintRadio);}
  });
  /* Radio is a background source now: no panel, just the button state.
     Long-press opens the station menu (BBC / NHK); the release click
     after a long press is swallowed, exactly like the Podcast button. */
  var stationMenu=document.getElementById('audio-radio-menu-list');
  function closeStationMenu(){
    if(stationMenu)stationMenu.hidden=true;
    if(radioPlay)radioPlay.setAttribute('aria-expanded','false');
  }
  function openStationMenu(){
    if(!stationMenu)return;
    var C=window.LibraryAudioCoordinator;var cur=C?C.getLastRadio():'radio4';
    stationMenu.querySelectorAll('[data-station-choice]').forEach(function(item){
      item.classList.toggle('is-current',item.getAttribute('data-station-choice')===cur);
    });
    stationMenu.hidden=false;
    if(radioPlay)radioPlay.setAttribute('aria-expanded','true');
  }
  if(stationMenu)stationMenu.addEventListener('click',function(event){
    var item=event.target&&event.target.closest?event.target.closest('[data-station-choice]'):null;
    if(!item)return;
    var target=item.getAttribute('data-station-choice');
    var C=window.LibraryAudioCoordinator;
    closeStationMenu();
    if(!C)return;
    var a=C.getAudio(target);if(!a)return;
    if(a.paused){C.switchTo(target);var r=a.play();if(r&&r.catch)r.catch(function(){});}
  });
  if(radioPlay){
    var radioPressTimer=null;
    var clearRadioPress=function(){if(radioPressTimer){clearTimeout(radioPressTimer);radioPressTimer=null;}};
    radioPlay.addEventListener('pointerdown',function(){
      var pc=window.LibraryAudioCoordinator;
      var ra=pc?pc.getAudio(pc.getLastRadio()):null;
      radioPlay.__tapIntent={target:pc?pc.getLastRadio():null,wasPaused:ra?!!ra.paused:true,at:Date.now()};
      if(pc)primeForBackground(ra);
      clearRadioPress();
      radioPressTimer=setTimeout(function(){
        radioPressTimer=null;
        radioLongPressed=true;
        setTimeout(function(){radioLongPressed=false;},1000);
        if(stationMenu&&!stationMenu.hidden)closeStationMenu();else openStationMenu();
      },450);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(function(type){
      radioPlay.addEventListener(type,clearRadioPress);
    });
    radioPlay.addEventListener('contextmenu',function(event){event.preventDefault();});
  }
  /* Podcast */
  var podPlay=document.getElementById('audio-podcast-play');
  var feedMenu=document.getElementById('audio-podcast-menu-list');
  function currentFeed(){
    var tab=document.querySelector('[data-podcast-tab][aria-selected="true"]');
    var id=tab?tab.getAttribute('data-podcast-tab'):'bbc';
    if(id==='topchart'){
      /* The chart tab is a browser, not a source: the quick button keeps
         naming and controlling the active feed behind it. */
      try{id=localStorage.getItem('personal-library-podcast-active-feed')||'bbc';}catch(e){id='bbc';}
      if(id==='topchart')id='bbc';
    }
    return id;
  }
  function feedAudio(feed){return document.getElementById('podcast-'+feed+'-audio');}
  /* The button names the selected feed, like Radio names its station:
     Podcast NEWS EN / NEWS JP / LUKE'S EN / EASY JP / KJV. */
  var PODCAST_SUFFIX={bbc:'NEWS EN',chronicle:'NEWS JP',english:"LUKE'S EN",japanese:'EASY JP',kjv:'KJV'};
  function paintPodcastLabel(){
    if(!podPlay)return;
    var feedId=currentFeed();
    var suffix=PODCAST_SUFFIX[feedId];
    if(!suffix){
      /* A reader-added show names itself on the button. */
      var titleEl=document.querySelector('[data-podcast-title="'+feedId+'"]');
      var show=titleEl?titleEl.getAttribute('data-podcast-show-title'):'';
      suffix=show?show.toUpperCase().slice(0,18):'NEWS EN';
    }
    var label=podPlay.querySelector('[data-label]');
    if(label)label.textContent='Podcast '+suffix;
    podPlay.setAttribute('aria-label','Play or pause Podcast '+suffix);
  }
  function paintPodcast(){
    paintPodcastLabel();
    if(currentFeed()==='kjv'){
      var b=document.getElementById('niv-bible-audio');
      paintGlyph(podPlay,!!(b&&!b.paused));
      return;
    }
    var a=feedAudio(currentFeed());
    paintGlyph(podPlay,!!(a&&!a.paused));
  }
  function toggleFeed(feed){
    var intent=podPlay?podPlay.__armedIntent:null;
    if(podPlay)podPlay.__armedIntent=null;
    if(intent&&intent.feed===feed&&typeof window.LibraryToggleFeed==='function'){
      window.LibraryToggleFeed(feed,intent.wasPaused);
      return;
    }
    var section=document.querySelector('[data-podcast-feed-panel="'+feed+'"]');
    var mini=section?section.querySelector('.podcast-mini-play'):null;
    if(mini)mini.click();
  }
  var podLongPressed=false;
  if(podPlay)podPlay.addEventListener('click',function(){
    if(podLongPressed){podLongPressed=false;return;}
    setMode('podcast');
    if(currentFeed()==='kjv'){
      var bt=document.getElementById('niv-bible-toggle');if(bt)bt.click();
      paintPodcast();
      return;
    }
    toggleFeed(currentFeed());
  });
  ['bbc','chronicle','english','japanese'].forEach(function(f){
    var a=feedAudio(f);
    if(a){a.addEventListener('play',paintPodcast);a.addEventListener('pause',paintPodcast);a.addEventListener('ended',paintPodcast);}
  });
  /* Reader-added shows create their audio elements at runtime, long
     after the wiring above — so repaint the Podcast button from a
     capture-phase document listener for ANY podcast audio's state
     change. Without it, switching to Radio paused an added show but
     left the button showing the pause glyph. */
  ['play','pause','ended'].forEach(function(type){
    document.addEventListener(type,function(event){
      var t=event.target;
      if(t&&t.id&&t.id.indexOf('podcast-')===0)paintPodcast();
    },true);
  });
  var bibleAudioEl=document.getElementById('niv-bible-audio');
  if(bibleAudioEl){bibleAudioEl.addEventListener('play',paintPodcast);bibleAudioEl.addEventListener('pause',paintPodcast);bibleAudioEl.addEventListener('ended',paintPodcast);}
  function closeFeedMenu(){
    if(feedMenu)feedMenu.hidden=true;
    if(podPlay)podPlay.setAttribute('aria-expanded','false');
  }
  function openFeedMenu(){
    if(!feedMenu)return;
    paintFeedMenu();
    feedMenu.hidden=false;
    if(podPlay)podPlay.setAttribute('aria-expanded','true');
  }
  function paintFeedMenu(){
    if(!feedMenu)return;
    var cur=currentFeed();
    feedMenu.querySelectorAll('[data-feed-choice]').forEach(function(item){
      item.classList.toggle('is-current',item.getAttribute('data-feed-choice')===cur);
    });
  }
  /* Long-press the Podcast button to choose a feed; a short press is
     play/pause. 450ms threshold; the release click after a long press is
     swallowed so it cannot also toggle playback. */
  if(podPlay){
    var podPressTimer=null;
    var clearPodPress=function(){if(podPressTimer){clearTimeout(podPressTimer);podPressTimer=null;}};
    podPlay.addEventListener('pointerdown',function(){
      var pf=currentFeed();
      var pa=pf==='kjv'?document.getElementById('niv-bible-audio'):feedAudio(pf);
      /* Remember what the listener MEANT before the prime touches
         anything. The prime's own play can take effect on iOS even
         though its counter-pause was issued (a pause sent while a
         play is still pending is dropped there), which flips the
         element's live state — a toggle that read the live state
         300ms later then paused instead of resuming, every time.
         The toggle therefore acts on the state at finger-down. */
      podPlay.__tapIntent={feed:pf,wasPaused:pa?!!pa.paused:true,at:Date.now()};
      primeForBackground(pa);
      clearPodPress();
      podPressTimer=setTimeout(function(){
        podPressTimer=null;
        podLongPressed=true;
        /* The flag only exists to swallow the release click that follows;
           expire it so a cancelled press can never eat a later tap. */
        setTimeout(function(){podLongPressed=false;},1000);
        setMode('podcast');
        if(feedMenu&&!feedMenu.hidden)closeFeedMenu();else openFeedMenu();
      },450);
    });
    ['pointerup','pointerleave','pointercancel'].forEach(function(type){
      podPlay.addEventListener(type,clearPodPress);
    });
    podPlay.addEventListener('contextmenu',function(event){event.preventDefault();});
  }
  if(feedMenu)feedMenu.addEventListener('click',function(event){
    var item=event.target&&event.target.closest?event.target.closest('[data-feed-choice]'):null;
    if(!item)return;
    var feed=item.getAttribute('data-feed-choice');
    var tab=document.querySelector('[data-podcast-tab="'+feed+'"]');
    /* While the Manage panel is the visible card, even the current
       feed's entry must click through: that click is how the
       listener gets back from the manager to their feed's list
       (panel.js restores the card without touching playback). */
    var managerShowing=!!document.querySelector('[data-podcast-tab="topchart"][aria-selected="true"]');
    if(tab&&(currentFeed()!==feed||managerShowing))tab.click();
    setMode('podcast');
    closeFeedMenu();
    if(feed==='kjv'){
      var ba=document.getElementById('niv-bible-audio');
      if(ba&&ba.paused){var bt2=document.getElementById('niv-bible-toggle');if(bt2)bt2.click();}
      paintPodcast();
      return;
    }
    var a=feedAudio(feed);
    if(a&&a.paused)toggleFeed(feed);
    paintPodcast();
  });
  document.addEventListener('click',function(event){
    var t=event.target;
    if(!t||!t.closest)return;
    if(feedMenu&&!feedMenu.hidden&&!t.closest('.audio-quick-group--podcast'))closeFeedMenu();
    if(stationMenu&&!stationMenu.hidden&&!t.closest('.audio-quick-group--radio'))closeStationMenu();
  },true);
  document.addEventListener('click',function(event){
    var t=event.target;
    if(t&&t.closest&&t.closest('[data-podcast-tab]'))paintPodcast();
  });
  /* One standard tap model for the quick buttons, the same as the Home
     tab's: a tap only counts once the 300ms double-tap window (the usual
     platform standard) closes without a second tap. A second tap inside
     the window is a double tap and opens the chooser menu — the held
     first tap is discarded, so playback never toggles on a double tap. */
  var quickTapHeld={}, quickTapReplay={};
  document.addEventListener('click',function(event){
    var t=event.target;
    var btn=t&&t.closest?t.closest('#audio-podcast-play, #audio-radio-play'):null;
    if(!btn)return;
    var id=btn.id;
    if(quickTapReplay[id]){quickTapReplay[id]=false;return;}
    if(id==='audio-podcast-play'?podLongPressed:radioLongPressed)return;
    var held=quickTapHeld[id];
    if(held){
      clearTimeout(held.timer);
      quickTapHeld[id]=null;
      event.preventDefault();event.stopPropagation();
      if(id==='audio-podcast-play'){setMode('podcast');if(feedMenu&&!feedMenu.hidden)closeFeedMenu();else openFeedMenu();}
      else if(stationMenu&&!stationMenu.hidden)closeStationMenu();else openStationMenu();
      return;
    }
    /* Bind the intent captured at this tap's pointerdown to THIS
       click, so only this tap's own replay can act on it. An intent
       left over from an earlier press (a long press, a stray test
       dispatch) must never steer a later, unrelated click — the
       binding gate is the pointerdown-to-click gap of a real tap. */
    var intent=btn.__tapIntent;btn.__tapIntent=null;
    btn.__armedIntent=(intent&&(Date.now()-intent.at)<400)?intent:null;
    event.preventDefault();event.stopPropagation();
    quickTapHeld[id]={timer:setTimeout(function(){
      quickTapHeld[id]=null;
      quickTapReplay[id]=true;
      btn.click();
    },300)};
  },true);
  paintRadio();paintPodcast();
  window.LibraryAudioShell={setOpen:setShell,isOpen:function(){return !shell.hidden;},setMode:setMode,getMode:function(){return mode;}};
})(window,document);

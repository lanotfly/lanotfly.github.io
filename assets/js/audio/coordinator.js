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
    Object.keys(audioIds).forEach(function(name){
      if(name===target)return;
      if(target==='podcast'&&name.indexOf('podcast')===0)return;
      var audio=getAudio(name);if(audio&&!audio.paused){try{audio.pause();}catch(_){}}
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
  shellToggle.addEventListener('click',function(){setShell(shell.hidden);});
  function paintGlyph(btn,playing){
    if(!btn)return;
    btn.classList.toggle('is-playing',playing);
    var g=btn.querySelector('[data-glyph]');if(g)g.innerHTML=playing?PAUSE:PLAY;
  }
  /* Radio */
  var radioPlay=document.getElementById('audio-radio-play');
  function paintRadio(){
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
    if(!a.paused){a.pause();return;}
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
      clearRadioPress();
      radioPressTimer=setTimeout(function(){
        radioPressTimer=null;
        radioLongPressed=true;
        setTimeout(function(){radioLongPressed=false;},1000);
        openStationMenu();
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
    return tab?tab.getAttribute('data-podcast-tab'):'bbc';
  }
  function feedAudio(feed){return document.getElementById('podcast-'+feed+'-audio');}
  function paintPodcast(){
    if(currentFeed()==='kjv'){
      var b=document.getElementById('niv-bible-audio');
      paintGlyph(podPlay,!!(b&&!b.paused));
      return;
    }
    var a=feedAudio(currentFeed());
    paintGlyph(podPlay,!!(a&&!a.paused));
  }
  function toggleFeed(feed){
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
      clearPodPress();
      podPressTimer=setTimeout(function(){
        podPressTimer=null;
        podLongPressed=true;
        /* The flag only exists to swallow the release click that follows;
           expire it so a cancelled press can never eat a later tap. */
        setTimeout(function(){podLongPressed=false;},1000);
        setMode('podcast');
        openFeedMenu();
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
    if(tab&&currentFeed()!==feed)tab.click();
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
  paintRadio();paintPodcast();
  window.LibraryAudioShell={setOpen:setShell,isOpen:function(){return !shell.hidden;},setMode:setMode,getMode:function(){return mode;}};
})(window,document);

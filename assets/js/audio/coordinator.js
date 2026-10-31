(function(window,document){
  'use strict';
  if(window.LibraryAudioCoordinator)return;
  var audioIds={radio4:'radio4-audio',nhk:'nhk-radio-audio',bible:'niv-bible-audio',podcastBbc:'podcast-bbc-audio',podcastChronicle:'podcast-chronicle-audio',podcastEnglish:'podcast-english-audio',podcastJapanese:'podcast-japanese-audio'};
  function getAudio(name){return document.getElementById(audioIds[name]);}
  var buttonsBySource={radio4:['radio4-toggle'],nhk:['nhk-radio-toggle'],bible:['niv-bible-toggle']};
  var activeTarget=null;
  var radioToggle=document.getElementById('library-radio-toggle');
  var radioPanel=document.getElementById('library-radio-panel');
  var lastRadio='radio4';
  try{lastRadio=localStorage.getItem('library_last_radio_station')==='nhk'?'nhk':'radio4';}catch(_){}
  function clearButtonState(button){
    if(!button)return;
    button.setAttribute('aria-pressed','false');
    button.classList.remove('is-playing','is-selected');
    if(button.id==='radio4-toggle') ['background-color','color','border-color','border-style','box-shadow'].forEach(function(p){button.style.removeProperty(p);});
  }
  function rememberRadio(target){
    if(target!=='radio4'&&target!=='nhk')return;
    lastRadio=target;
    try{localStorage.setItem('library_last_radio_station',target);}catch(_){}
  }
  function closeRadioPanel(){
    if(!radioToggle||!radioPanel)return;
    radioToggle.setAttribute('aria-expanded','false');radioToggle.classList.remove('is-open','is-active');radioPanel.hidden=true;
  }
  function switchTo(target){
    activeTarget=target;
    if(target==='radio4'||target==='nhk')rememberRadio(target);
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
  var kjvPanel=document.getElementById('niv-bible-panel');
  var podRoot=document.getElementById('library-podcast-panel');
  var mode='podcast';
  function applyMode(){
    if(radioPanel)radioPanel.hidden=mode!=='radio';
    if(kjvPanel)kjvPanel.hidden=mode!=='kjv';
    if(podRoot){
      if(mode==='podcast'&&podRoot.hidden&&typeof window.LibraryOpenPodcastPanel==='function')window.LibraryOpenPodcastPanel();
      if(mode!=='podcast'&&!podRoot.hidden&&typeof window.LibraryClosePodcastPanel==='function')window.LibraryClosePodcastPanel();
    }
    var rm=document.getElementById('audio-radio-menu');if(rm)rm.setAttribute('aria-expanded',String(mode==='radio'));
    var km=document.getElementById('audio-kjv-menu');if(km)km.setAttribute('aria-expanded',String(mode==='kjv'));
  }
  function setMode(next){mode=next;applyMode();}
  function setShell(open){
    shell.hidden=!open;
    shellToggle.setAttribute('aria-expanded',String(open));
    shellToggle.classList.toggle('is-open',open);
    shellToggle.classList.toggle('is-active',open);
    if(open)applyMode();else closeFeedMenu();
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
    var C=window.LibraryAudioCoordinator;var playing=false;
    if(C){var a=C.getAudio(C.getLastRadio());playing=!!(a&&!a.paused);}
    paintGlyph(radioPlay,playing);
  }
  if(radioPlay)radioPlay.addEventListener('click',function(){
    setMode('radio');
    var C=window.LibraryAudioCoordinator;if(!C)return;
    var target=C.getLastRadio();var a=C.getAudio(target);if(!a)return;
    if(!a.paused){a.pause();return;}
    C.switchTo(target);
    var r=a.play();if(r&&r.catch)r.catch(function(){});
  });
  ['radio4-audio','nhk-radio-audio'].forEach(function(id){
    var a=document.getElementById(id);
    if(a){a.addEventListener('play',paintRadio);a.addEventListener('pause',paintRadio);a.addEventListener('ended',paintRadio);}
  });
  var radioMenu=document.getElementById('audio-radio-menu');
  if(radioMenu)radioMenu.addEventListener('click',function(){setMode(mode==='radio'?'podcast':'radio');});
  /* KJV */
  var kjvPlay=document.getElementById('audio-kjv-play');
  var kjvToggle=document.getElementById('niv-bible-toggle');
  var kjvAudio=document.getElementById('niv-bible-audio');
  function paintKjv(){paintGlyph(kjvPlay,!!(kjvAudio&&!kjvAudio.paused));}
  if(kjvPlay&&kjvToggle)kjvPlay.addEventListener('click',function(){setMode('kjv');kjvToggle.click();});
  if(kjvAudio){kjvAudio.addEventListener('play',paintKjv);kjvAudio.addEventListener('pause',paintKjv);kjvAudio.addEventListener('ended',paintKjv);}
  var kjvMenu=document.getElementById('audio-kjv-menu');
  if(kjvMenu)kjvMenu.addEventListener('click',function(){setMode(mode==='kjv'?'podcast':'kjv');});
  /* Podcast */
  var podPlay=document.getElementById('audio-podcast-play');
  var podMenuBtn=document.getElementById('audio-podcast-menu');
  var feedMenu=document.getElementById('audio-podcast-menu-list');
  function currentFeed(){
    var tab=document.querySelector('[data-podcast-tab][aria-selected="true"]');
    return tab?tab.getAttribute('data-podcast-tab'):'bbc';
  }
  function feedAudio(feed){return document.getElementById('podcast-'+feed+'-audio');}
  function paintPodcast(){
    var a=feedAudio(currentFeed());
    paintGlyph(podPlay,!!(a&&!a.paused));
  }
  function toggleFeed(feed){
    var section=document.querySelector('[data-podcast-feed-panel="'+feed+'"]');
    var mini=section?section.querySelector('.podcast-mini-play'):null;
    if(mini)mini.click();
  }
  if(podPlay)podPlay.addEventListener('click',function(){setMode('podcast');toggleFeed(currentFeed());});
  ['bbc','chronicle','english','japanese'].forEach(function(f){
    var a=feedAudio(f);
    if(a){a.addEventListener('play',paintPodcast);a.addEventListener('pause',paintPodcast);a.addEventListener('ended',paintPodcast);}
  });
  function closeFeedMenu(){
    if(feedMenu)feedMenu.hidden=true;
    if(podMenuBtn)podMenuBtn.setAttribute('aria-expanded','false');
  }
  function paintFeedMenu(){
    if(!feedMenu)return;
    var cur=currentFeed();
    feedMenu.querySelectorAll('[data-feed-choice]').forEach(function(item){
      item.classList.toggle('is-current',item.getAttribute('data-feed-choice')===cur);
    });
  }
  if(podMenuBtn&&feedMenu)podMenuBtn.addEventListener('click',function(){
    var open=feedMenu.hidden;
    if(open){paintFeedMenu();feedMenu.hidden=false;podMenuBtn.setAttribute('aria-expanded','true');}
    else closeFeedMenu();
  });
  if(feedMenu)feedMenu.addEventListener('click',function(event){
    var item=event.target&&event.target.closest?event.target.closest('[data-feed-choice]'):null;
    if(!item)return;
    var feed=item.getAttribute('data-feed-choice');
    var tab=document.querySelector('[data-podcast-tab="'+feed+'"]');
    if(tab&&currentFeed()!==feed)tab.click();
    setMode('podcast');
    closeFeedMenu();
    var a=feedAudio(feed);
    if(a&&a.paused)toggleFeed(feed);
    paintPodcast();
  });
  document.addEventListener('click',function(event){
    if(!feedMenu||feedMenu.hidden)return;
    var t=event.target;
    if(t&&t.closest&&!t.closest('.audio-quick-group--podcast'))closeFeedMenu();
  },true);
  paintRadio();paintKjv();paintPodcast();
  window.LibraryAudioShell={setOpen:setShell,isOpen:function(){return !shell.hidden;},setMode:setMode,getMode:function(){return mode;}};
})(window,document);

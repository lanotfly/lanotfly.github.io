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
/* Audio shell: opening Audio lands on the Podcast panel. Radio and KJV
   live in the quick row above it — one play button each (radio defaults
   to the last station, BBC the first time; KJV resumes its sequential
   chapter playback) plus a small chooser button: radio's opens the
   station strip, KJV's opens the book/chapter drawer. The old module
   toggles stay in the DOM, hidden, because the modules and this
   coordinator are wired to their IDs; the KJV drawer and the radio
   strip are owned solely by their chooser buttons. */
(function(window,document){
  'use strict';
  var shellToggle=document.getElementById('library-audio-toggle');
  var shell=document.getElementById('library-audio-panel');
  if(!shellToggle||!shell)return;
  var PLAY='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.8 6.2v11.6c0 .8.9 1.3 1.6.9l9-5.8c.6-.4.6-1.4 0-1.8l-9-5.8c-.7-.4-1.6.1-1.6.9z" fill="currentColor"/></svg>';
  var PAUSE='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.5 6h3.2v12H7.5zM13.3 6h3.2v12h-3.2z" fill="currentColor"/></svg>';
  function setShell(open){
    shell.hidden=!open;
    shellToggle.setAttribute('aria-expanded',String(open));
    shellToggle.classList.toggle('is-open',open);
    shellToggle.classList.toggle('is-active',open);
    if(open){
      var root=document.getElementById('library-podcast-panel');
      var pt=document.getElementById('library-podcast-toggle');
      if(root&&root.hidden&&pt)pt.click();
    }
  }
  shellToggle.addEventListener('click',function(){setShell(shell.hidden);});
  var radioPlay=document.getElementById('audio-radio-play');
  var radioMenu=document.getElementById('audio-radio-menu');
  var radioPanel=document.getElementById('library-radio-panel');
  function paintRadio(){
    if(!radioPlay)return;
    var C=window.LibraryAudioCoordinator;
    var playing=false;
    if(C){var a=C.getAudio(C.getLastRadio());playing=!!(a&&!a.paused);}
    radioPlay.classList.toggle('is-playing',playing);
    var g=radioPlay.querySelector('[data-glyph]');if(g)g.innerHTML=playing?PAUSE:PLAY;
  }
  if(radioPlay)radioPlay.addEventListener('click',function(){
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
  if(radioMenu&&radioPanel)radioMenu.addEventListener('click',function(){
    radioPanel.hidden=!radioPanel.hidden;
    radioMenu.setAttribute('aria-expanded',String(!radioPanel.hidden));
  });
  var kjvPlay=document.getElementById('audio-kjv-play');
  var kjvMenu=document.getElementById('audio-kjv-menu');
  var kjvPanel=document.getElementById('niv-bible-panel');
  var kjvToggle=document.getElementById('niv-bible-toggle');
  var kjvAudio=document.getElementById('niv-bible-audio');
  function paintKjv(){
    if(!kjvPlay)return;
    var playing=!!(kjvAudio&&!kjvAudio.paused);
    kjvPlay.classList.toggle('is-playing',playing);
    var g=kjvPlay.querySelector('[data-glyph]');if(g)g.innerHTML=playing?PAUSE:PLAY;
  }
  if(kjvPlay&&kjvToggle)kjvPlay.addEventListener('click',function(){kjvToggle.click();});
  if(kjvAudio){kjvAudio.addEventListener('play',paintKjv);kjvAudio.addEventListener('pause',paintKjv);kjvAudio.addEventListener('ended',paintKjv);}
  if(kjvMenu&&kjvPanel)kjvMenu.addEventListener('click',function(){
    kjvPanel.hidden=!kjvPanel.hidden;
    kjvMenu.setAttribute('aria-expanded',String(!kjvPanel.hidden));
  });
  if(window.MutationObserver){
    var sync=function(){
      if(radioMenu&&radioPanel)radioMenu.setAttribute('aria-expanded',String(!radioPanel.hidden));
      if(kjvMenu&&kjvPanel)kjvMenu.setAttribute('aria-expanded',String(!kjvPanel.hidden));
    };
    [radioPanel,kjvPanel].forEach(function(pn){if(pn)new MutationObserver(sync).observe(pn,{attributes:true,attributeFilter:['hidden']});});
  }
  paintRadio();paintKjv();
  window.LibraryAudioShell={setOpen:setShell,isOpen:function(){return !shell.hidden;}};
})(window,document);

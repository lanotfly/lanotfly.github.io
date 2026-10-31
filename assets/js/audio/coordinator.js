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
    if(target!=='bible'){var bp=document.getElementById('niv-bible-panel'),bb=document.getElementById('niv-bible-toggle');if(bp)bp.hidden=true;if(bb)bb.setAttribute('aria-expanded','false');}
    if(target==='bible'){var b=document.getElementById('niv-bible-panel'),bt=document.getElementById('niv-bible-toggle');if(b)b.hidden=false;if(bt)bt.setAttribute('aria-expanded','true');}
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
/* Unified Audio shell (Plan B): one panel at the top, with the Radio /
   KJV / Podcast toggles as master tabs inside it. The three buttons keep
   their IDs and all of their module wiring — this block owns only the
   shell's open/close, remembers the last-used view, and activates a view
   when the shell opens with none visible (without autoplaying radio). */
(function(window,document){
  'use strict';
  var shellToggle=document.getElementById('library-audio-toggle');
  var shell=document.getElementById('library-audio-panel');
  if(!shellToggle||!shell)return;
  var VIEW_KEY='library_audio_view';
  var views={
    radio:{toggle:'library-radio-toggle',panel:'library-radio-panel'},
    bible:{toggle:'niv-bible-toggle',panel:'niv-bible-panel'},
    podcast:{toggle:'library-podcast-toggle',panel:'library-podcast-panel'}
  };
  function lastView(){try{var v=localStorage.getItem(VIEW_KEY);if(v&&views[v])return v;}catch(e){}return 'podcast';}
  function anyOpen(){return Object.keys(views).some(function(k){var p=document.getElementById(views[k].panel);return p&&!p.hidden;});}
  function closePodcast(){var pt=document.getElementById('library-podcast-toggle');if(pt&&pt.getAttribute('aria-expanded')==='true'&&typeof window.LibraryClosePodcastPanel==='function')window.LibraryClosePodcastPanel();}
  function hideBible(){var bp=document.getElementById('niv-bible-panel'),bb=document.getElementById('niv-bible-toggle');if(bp)bp.hidden=true;if(bb)bb.setAttribute('aria-expanded','false');}
  function hideRadio(){var rt=document.getElementById('library-radio-toggle'),rp=document.getElementById('library-radio-panel');if(rt){rt.setAttribute('aria-expanded','false');rt.classList.remove('is-open','is-active');}if(rp)rp.hidden=true;}
  function activate(key){
    var v=views[key];if(!v)return;
    var panel=document.getElementById(v.panel),toggle=document.getElementById(v.toggle);
    if(!panel||!toggle||!panel.hidden)return;
    if(key==='podcast'){toggle.click();return;}
    if(key==='radio'){closePodcast();hideBible();panel.hidden=false;toggle.setAttribute('aria-expanded','true');toggle.classList.add('is-open','is-active');return;}
    hideRadio();closePodcast();panel.hidden=false;toggle.setAttribute('aria-expanded','true');
  }
  function setShell(open){
    shell.hidden=!open;
    shellToggle.setAttribute('aria-expanded',String(open));
    shellToggle.classList.toggle('is-open',open);
    shellToggle.classList.toggle('is-active',open);
    if(open&&!anyOpen())activate(lastView());
  }
  shellToggle.addEventListener('click',function(){setShell(shell.hidden);});
  Object.keys(views).forEach(function(key){
    var t=document.getElementById(views[key].toggle);
    if(t)t.addEventListener('click',function(){try{localStorage.setItem(VIEW_KEY,key);}catch(e){}});
  });
  window.LibraryAudioShell={setOpen:setShell,isOpen:function(){return !shell.hidden;}};
})(window,document);

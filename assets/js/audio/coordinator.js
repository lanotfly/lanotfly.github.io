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
  /* Apply the default purple treatment immediately on first render, not only after a click. */
  function applyInitialAudioTabColors(){
    var shell=document.querySelector('.site-nav-shell');
    if(!shell)return;
    [
      ['#library-radio-toggle','#f3eef9','#705493','#cbb9df'],
      ['#niv-bible-toggle','#f3eef9','#705493','#cbb9df'],
      ['#library-podcast-toggle','#f3eef9','#705493','#cbb9df']
    ].forEach(function(item){
      var button=shell.querySelector(item[0]);
      if(!button)return;
      button.style.setProperty('background-color',item[1],'important');
      button.style.setProperty('color',item[2],'important');
      button.style.setProperty('border-color',item[3],'important');
      button.style.setProperty('border-style','solid','important');
      button.style.setProperty('box-shadow','none','important');
    });
  }
  applyInitialAudioTabColors();
  /* Track visual navigation family without coupling reading clicks to playback or panel visibility. */
  document.addEventListener('click',function(event){
    var target=event.target&&event.target.closest&&event.target.closest(
      '#library-radio-toggle,#radio4-toggle,#nhk-radio-toggle,#niv-bible-toggle,#library-podcast-toggle,#library-book-toggle,.site-tab--home,.book-secondary-link,.book-chapter-link'
    );
    if(!target)return;
    var shell=target.closest('.site-nav-shell');
    if(!shell)return;
    if(target.matches('#library-radio-toggle,#radio4-toggle,#nhk-radio-toggle')){
      shell.setAttribute('data-active-family','audio');
      shell.setAttribute('data-active-audio-tab','radio');
    }else if(target.matches('#niv-bible-toggle')){
      shell.setAttribute('data-active-family','audio');
      shell.setAttribute('data-active-audio-tab','kjv');
    }else if(target.matches('#library-podcast-toggle')){
      shell.setAttribute('data-active-family','audio');
      shell.setAttribute('data-active-audio-tab','podcast');
    }else{
      shell.setAttribute('data-active-family','reading');
      shell.setAttribute('data-active-reading-tab',target.matches('#library-book-toggle,.book-secondary-link,.book-chapter-link')?'book':'home');
      shell.removeAttribute('data-active-audio-tab');
    }
    /* Explicitly maintain the audio tabs' family colors. Some older active-state
       code applies inline important styles, which can beat stylesheet-only fixes. */
    var audioTabColors=[
      ['#library-radio-toggle','#f3eef9','#705493','#cbb9df'],
      ['#niv-bible-toggle','#f3eef9','#705493','#cbb9df'],
      ['#library-podcast-toggle','#f3eef9','#705493','#cbb9df']
    ];
    audioTabColors.forEach(function(item){
      var button=shell.querySelector(item[0]);
      if(!button)return;
      button.style.setProperty('background-color',item[1],'important');
      button.style.setProperty('color',item[2],'important');
      button.style.setProperty('border-color',item[3],'important');
      button.style.setProperty('border-style','solid','important');
      button.style.setProperty('box-shadow','none','important');
    });
    if(shell.getAttribute('data-active-family')==='audio'){
      var selected=shell.getAttribute('data-active-audio-tab');
      var selectedId=selected==='radio'?'#library-radio-toggle':selected==='kjv'?'#niv-bible-toggle':'#library-podcast-toggle';
      var activeButton=shell.querySelector(selectedId);
      if(activeButton){
        activeButton.style.setProperty('background-color','#e9def5','important');
        activeButton.style.setProperty('color','#50386a','important');
        activeButton.style.setProperty('border-color','#9581b3','important');
        activeButton.style.setProperty('border-style','solid','important');
        activeButton.style.setProperty('border-width','2px','important');
      }
    }
  },true);
  window.LibraryAudioCoordinator={switchTo:switchTo,getAudio:getAudio,getActiveTarget:function(){return activeTarget;},setRadioPanelOpen:setRadioPanelOpen,getLastRadio:function(){return lastRadio;}};
  window.__prepareRadioPlayback=function(target){switchTo(target||lastRadio||'radio4');};
})(window,document);
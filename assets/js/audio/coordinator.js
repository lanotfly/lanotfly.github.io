(function(window,document){
  'use strict';
  if(window.LibraryAudioCoordinator)return;
  var audioIds={radio4:'radio4-audio',nhk:'nhk-radio-audio',podcast:'podcast-audio',bible:'niv-bible-audio',newsBbc:'news-bbc-audio',newsChronicle:'news-chronicle-audio',newsEnglish:'news-english-audio',newsJapanese:'news-japanese-audio'};
  function getAudio(name){return document.getElementById(audioIds[name]);}
  var buttonsBySource={
    radio4:['radio4-toggle'],
    nhk:['nhk-radio-toggle'],
    podcast:[],
    bible:['niv-bible-toggle']
  };
  function clearButtonState(button){
    if(!button)return;
    button.setAttribute('aria-pressed','false');
    button.classList.remove('is-playing','is-selected');
    if(button.id==='radio4-toggle'){
      ['background-color','color','border-color','border-style','box-shadow'].forEach(function(property){
        button.style.removeProperty(property);
      });
    }
  }
  var activeTarget=null;
  function switchTo(target){
    activeTarget=target;
    /* Clear stale selected/playing UI first, then stop outgoing audio before new playback. */
    Object.keys(buttonsBySource).forEach(function(source){
      if(source===target)return;
      buttonsBySource[source].forEach(function(id){clearButtonState(document.getElementById(id));});
    });
    Object.keys(audioIds).forEach(function(name){
      if(name===target)return;
      /* News is listening-first: changing to another audio source stops News,\n         but switching into News must not pause its own two feed elements. */
      if(target==='news'&&name.indexOf('news')===0)return;
      var audio=getAudio(name);
      if(audio&&!audio.paused){try{audio.pause();}catch(_){}}
    });
    if(target!=='podcast'){
      var podcastPanel=document.getElementById('podcast-episode-panel');
      if(podcastPanel)podcastPanel.hidden=true;
    }
    if(target!=='bible'){
      var biblePanel=document.getElementById('niv-bible-panel');
      var bibleButton=document.getElementById('niv-bible-toggle');
      if(biblePanel)biblePanel.hidden=true;
      if(bibleButton)bibleButton.setAttribute('aria-expanded','false');
    }
    /* Ensure the newly selected player's panel is visible. */
    if(target==='podcast'){
      var activePodcastPanel=document.getElementById('podcast-episode-panel');
      if(activePodcastPanel)activePodcastPanel.hidden=false;
    }
    if(target==='bible'){
      var activeBiblePanel=document.getElementById('niv-bible-panel');
      var activeBibleButton=document.getElementById('niv-bible-toggle');
      if(activeBiblePanel)activeBiblePanel.hidden=false;
      if(activeBibleButton)activeBibleButton.setAttribute('aria-expanded','true');
    }
    return true;
  }
  var radioToggle=document.getElementById('library-radio-toggle');
  var radioPanel=document.getElementById('library-radio-panel');
  function setRadioPanelOpen(open){
    if(!radioToggle||!radioPanel)return;
    radioToggle.setAttribute('aria-expanded',String(!!open));
    radioToggle.classList.toggle('is-open',!!open);
    radioToggle.classList.toggle('is-active',!!open);
    radioPanel.hidden=!open;
    if(!open)return;
    /* Opening the Radio selector closes other listening panels, but does not stop
       a radio station that is already playing. */
    var newsToggle=document.getElementById('library-news-toggle');
    if(newsToggle&&newsToggle.getAttribute('aria-expanded')==='true')newsToggle.click();
    ['podcast-audio','niv-bible-audio','news-bbc-audio','news-chronicle-audio','news-english-audio','news-japanese-audio'].forEach(function(id){
      var audio=document.getElementById(id);if(audio&&!audio.paused){try{audio.pause();}catch(_){}}
    });
    var podcastPanel=document.getElementById('podcast-episode-panel');
    if(podcastPanel)podcastPanel.hidden=true;
    var biblePanel=document.getElementById('niv-bible-panel');
    var bibleButton=document.getElementById('niv-bible-toggle');
    if(biblePanel)biblePanel.hidden=true;
    if(bibleButton)bibleButton.setAttribute('aria-expanded','false');
    /* A synthetic click used to close another panel also reaches the global
       click handler; re-assert Radio as the selected panel after that closes. */
    radioToggle.setAttribute('aria-expanded','true');
    radioToggle.classList.add('is-open','is-active');
    radioPanel.hidden=false;
  }
  if(radioToggle&&radioPanel){
    radioToggle.addEventListener('click',function(){
      setRadioPanelOpen(radioToggle.getAttribute('aria-expanded')!=='true');
    });
    document.addEventListener('click',function(event){
      var target=event.target&&event.target.closest&&event.target.closest('#library-news-toggle,#niv-bible-toggle,.site-tab--home,.site-tab--data,.site-tab--algorithm,.site-tab--ai,.site-tab--linux,.site-tab--cloud');
      if(target)setRadioPanelOpen(false);
    },true);
  }
  window.LibraryAudioCoordinator={switchTo:switchTo,getAudio:getAudio,getActiveTarget:function(){return activeTarget;},setRadioPanelOpen:setRadioPanelOpen};
  window.__prepareRadioPlayback=function(target){switchTo(target||'radio4');};
})(window,document);

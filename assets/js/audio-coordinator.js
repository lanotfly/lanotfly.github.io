(function(window,document){
  'use strict';
  if(window.LibraryAudioCoordinator)return;
  var audioIds={radio4:'radio4-audio',nhk:'nhk-radio-audio',podcast:'podcast-audio',bible:'niv-bible-audio'};
  function getAudio(name){return document.getElementById(audioIds[name]);}
  var buttonsBySource={
    radio4:['radio4-toggle'],
    nhk:['nhk-radio-toggle'],
    podcast:['bite-size-toggle','lukes-english-toggle'],
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
  window.LibraryAudioCoordinator={switchTo:switchTo,getAudio:getAudio,getActiveTarget:function(){return activeTarget;}};
  window.__prepareRadioPlayback=function(target){switchTo(target||'radio4');};
})(window,document);

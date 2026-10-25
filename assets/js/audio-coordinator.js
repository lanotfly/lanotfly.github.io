(function(window,document){
  'use strict';
  if(window.LibraryAudioCoordinator)return;
  var audioIds={radio4:'radio4-audio',nhk:'nhk-radio-audio',podcast:'podcast-audio',bible:'niv-bible-audio'};
  function getAudio(name){return document.getElementById(audioIds[name]);}
  function switchTo(target){
    /* Pause every outgoing source synchronously before the new source is played. */
    Object.keys(audioIds).forEach(function(name){
      if(name===target)return;
      var audio=getAudio(name);
      if(audio&&!audio.paused){try{audio.pause();}catch(_){}}
    });
    if(target==='radio4'||target==='nhk'||target==='bible'){
      var panel=document.getElementById('podcast-episode-panel');
      if(panel)panel.hidden=true;
    }
    return true;
  }
  window.LibraryAudioCoordinator={switchTo:switchTo,getAudio:getAudio};
  window.__prepareRadioPlayback=function(target){switchTo(target||'radio4');};
})(window,document);

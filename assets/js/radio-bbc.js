/* BBC Radio UI and events only; shared audio switching lives in audio-coordinator.js. */
(function(){
  if(window.__libraryBbcRadioInstalled)return;
  window.__libraryBbcRadioInstalled=true;
  var toggle=document.getElementById('radio4-toggle');
  var audio=document.getElementById('radio4-audio');
  var label=document.getElementById('radio4-label');
  if(!toggle||!audio||!label)return;
  function prepareRadioPlayback(){if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('radio4');}
  window.__prepareRadioPlayback=prepareRadioPlayback;
  /* Keep iOS Lock Screen / Control Center metadata independent of the chapter title. */
  function setRadioMetadata(){
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'BBC Radio',
      artist: 'BBC Radio',
      album: 'BBC Radio — Live',
      artwork: [
        { src: 'https://lanotfly.github.io/assets/images/bbc-radio-4-now-playing.png?v=20261024-6', sizes: '64x64', type: 'image/png' }
      ]
    });
    try {
      navigator.mediaSession.setActionHandler('play', function(){ prepareRadioPlayback(); audio.play().catch(function(){}); });
      navigator.mediaSession.setActionHandler('pause', function(){ audio.pause(); });
    } catch (_) {}
  }
  function paint(playing){
    toggle.setAttribute('aria-pressed',String(playing));
    toggle.setAttribute('aria-label',playing?'Pause BBC Radio':'Play BBC Radio');
    toggle.classList.toggle('is-playing',playing);
    /* Force the playing BBC button to remain outline-only, matching NHK. */
    if (playing) {
      toggle.style.setProperty('background-color','#f1ebf8','important');
      toggle.style.setProperty('color','#62458a','important');
      toggle.style.setProperty('border-color','#8e76ad','important');
      toggle.style.setProperty('border-style','solid','important');
      toggle.style.setProperty('box-shadow','0 0 0 2px rgba(112,84,147,.08)','important');
    } else {
      toggle.style.removeProperty('background-color');
      toggle.style.removeProperty('color');
      toggle.style.removeProperty('border-color');
      toggle.style.removeProperty('border-style');
      toggle.style.removeProperty('box-shadow');
    }
    label.textContent='BBC Radio';
    if ('mediaSession' in navigator) {
      /* A pause event from BBC must not mark NHK as paused if NHK is now playing. */
      var nhkAudio=document.getElementById('nhk-radio-audio');
      if (playing || !nhkAudio || nhkAudio.paused) {
        try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (_) {}
      }
    }
  }
  /* Do not claim the iPhone Now Playing session until BBC actually starts. */
  toggle.addEventListener('click',function(){
    if(!audio.paused){
      audio.pause();
      paint(false);
      return;
    }
    /* Coordinate all audio sources before starting BBC. */
    prepareRadioPlayback();
    setRadioMetadata();
    var result=audio.play();
    if(result&&typeof result.then==='function'){
      result.then(function(){
        /* Re-apply BBC metadata after playback starts, overriding the previous station. */
        setRadioMetadata();
        paint(true);
      }).catch(function(){paint(false);});
    }else{
      setRadioMetadata();
      paint(true);
    }
  });
  audio.addEventListener('play',function(){
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('radio4');
    setRadioMetadata();paint(true);
  });
  audio.addEventListener('pause',function(){paint(false);});
  audio.addEventListener('ended',function(){paint(false);});
  audio.addEventListener('error',function(){paint(false);});
})();

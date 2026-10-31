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
    if(window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('radio4',audio,{
        title:'BBC Radio',
        artist:'BBC Radio',
        album:'BBC Radio — Live',
        artwork:window.LibraryAudioIdentity.getArtwork('radio4')
      });
      return;
    }
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    try { navigator.mediaSession.metadata = new MediaMetadata({title:'BBC Radio',artist:'BBC Radio',album:'BBC Radio — Live',artwork:[{src:'https://lanotfly.github.io/assets/images/bbc-radio-4-now-playing.png',sizes:'512x512',type:'image/png'}]}); } catch (_) {}
  }
  function paint(playing){
    toggle.setAttribute('aria-pressed',String(playing));
    toggle.setAttribute('aria-label',playing?'Pause BBC Radio':'Play BBC Radio');
    toggle.classList.toggle('is-playing',playing);
    /* Button colors are painted centrally by nav-tab-state.js from aria-pressed. */
    label.textContent='BBC';
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

/* The current station's tab carries the play/pause glyph (like the
   podcast episode list): the shared painter marks the tabs container
   with the last-used station and the live play state, and CSS shows
   the glyph only on that station's tab. */
(function(){
  if(window.__libraryRadioGlyphInstalled)return;
  window.__libraryRadioGlyphInstalled=true;
  var tabs=document.querySelector('.radio-source-tabs');
  var bbcToggle=document.getElementById('radio4-toggle');
  var nhkToggle=document.getElementById('nhk-radio-toggle');
  var bbcAudio=document.getElementById('radio4-audio');
  var nhkAudio=document.getElementById('nhk-radio-audio');
  if(!tabs||!bbcToggle||!nhkToggle||!bbcAudio||!nhkAudio)return;
  var lastStation='bbc';
  function paint(){
    tabs.setAttribute('data-current',lastStation);
    tabs.setAttribute('data-playing',String(!bbcAudio.paused||!nhkAudio.paused));
  }
  [bbcAudio,nhkAudio].forEach(function(a){
    a.addEventListener('play',function(){lastStation=a===nhkAudio?'nhk':'bbc';paint();});
    a.addEventListener('pause',paint);
    a.addEventListener('ended',paint);
    a.addEventListener('error',paint);
  });
  bbcToggle.addEventListener('click',function(){lastStation='bbc';paint();});
  nhkToggle.addEventListener('click',function(){lastStation='nhk';paint();});
  paint();
})();

/* Play NHK Radio 1 directly from the official live stream; button toggles play/pause. */
(function(){
  if(window.__libraryNhkRadioInstalled)return;
  window.__libraryNhkRadioInstalled=true;
  var toggle=document.getElementById('nhk-radio-toggle');
  var audio=document.getElementById('nhk-radio-audio');
  if(!toggle||!audio||toggle.dataset.audioBound==='true')return;
  toggle.dataset.audioBound='true';
  function paint(playing){
    toggle.setAttribute('aria-pressed',String(playing));
    toggle.setAttribute('aria-label',playing?'Pause NHK Radio 1':'Play NHK Radio 1');
    toggle.title=playing?'Pause NHK Radio 1':'Play NHK Radio 1';
    toggle.classList.toggle('is-playing',playing);
    var label=toggle.querySelector('.nhk-radio-label');
    if(label) label.textContent='NHK';
    if(playing && window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('nhk',audio,{
        title:'NHK Radio 1',
        artist:'NHK らじる★らじる',
        album:'NHK Radio 1 — Live',
        artwork:window.LibraryAudioIdentity.getArtwork('nhk')
      });
    } else if('mediaSession' in navigator && !playing){
      var bbcAudio=document.getElementById('radio4-audio');
      if(!bbcAudio || bbcAudio.paused){try{navigator.mediaSession.playbackState='paused';}catch(_){}}
    }
  }
  toggle.addEventListener('click',function(){
    if(!audio.paused){audio.pause();return;}
    /* Stop podcast playback and hide its list before starting NHK. */
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('nhk');
    var result=audio.play();
    if(result&&typeof result.then==='function'){
      result.then(function(){paint(true);}).catch(function(){paint(false);});
    }else{
      paint(true);
    }
  });
  audio.addEventListener('play',function(){
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('nhk');
    paint(true);
  });
  audio.addEventListener('pause',function(){paint(false);});
  audio.addEventListener('ended',function(){paint(false);});
  audio.addEventListener('error',function(){paint(false);});
})();

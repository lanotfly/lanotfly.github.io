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
    if(label) label.textContent='NHK Radio';
    if('mediaSession' in navigator && playing){
      try{
        /* Only the station that is actively playing may claim Now Playing metadata. */
        navigator.mediaSession.playbackState='playing';
        if(typeof MediaMetadata!=='undefined') navigator.mediaSession.metadata=new MediaMetadata({
          title:'NHK Radio 1',
          artist:'NHK らじる★らじる',
          album:'NHK Radio 1 — Live',
          artwork:[
            {src:'https://lanotfly.github.io/assets/images/nhk-radio-square.png?v=20261024-2',sizes:'64x64',type:'image/png'}
          ]
        });
        navigator.mediaSession.setActionHandler('play',function(){if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('nhk');audio.play().catch(function(){paint(false);});});
        navigator.mediaSession.setActionHandler('pause',function(){audio.pause();});
      }catch(_){}
    } else if('mediaSession' in navigator){
      /* Do not overwrite the other station's title/artwork when this stream pauses. */
      var bbcAudio=document.getElementById('radio4-audio');
      if(!bbcAudio || bbcAudio.paused){
        try{navigator.mediaSession.playbackState='paused';}catch(_){}
      }
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

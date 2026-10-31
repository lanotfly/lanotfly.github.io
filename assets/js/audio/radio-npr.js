/* Play NPR News directly from the NPR program stream; button toggles play/pause. */
(function(){
  if(window.__libraryNprRadioInstalled)return;
  window.__libraryNprRadioInstalled=true;
  var toggle=document.getElementById('npr-radio-toggle');
  var audio=document.getElementById('npr-radio-audio');
  if(!toggle||!audio||toggle.dataset.audioBound==='true')return;
  toggle.dataset.audioBound='true';
  function paint(playing){
    toggle.setAttribute('aria-pressed',String(playing));
    toggle.setAttribute('aria-label',playing?'Pause NPR News':'Play NPR News');
    toggle.title=playing?'Pause NPR News':'Play NPR News';
    toggle.classList.toggle('is-playing',playing);
    var label=toggle.querySelector('.npr-radio-label');
    if(label) label.textContent='NPR';
    if(playing && window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('npr',audio,{
        title:'NPR News',
        artist:'NPR',
        album:'NPR News — Live',
        artwork:window.LibraryAudioIdentity.getArtwork('npr')
      });
    } else if('mediaSession' in navigator && !playing){
      var bbcAudio=document.getElementById('radio4-audio');
      if(!bbcAudio || bbcAudio.paused){try{navigator.mediaSession.playbackState='paused';}catch(_){}}
    }
  }
  toggle.addEventListener('click',function(){
    if(!audio.paused){audio.pause();return;}
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('npr');
    var result=audio.play();
    if(result&&typeof result.then==='function'){
      result.then(function(){paint(true);}).catch(function(){paint(false);});
    }else{
      paint(true);
    }
  });
  audio.addEventListener('play',function(){
    if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('npr');
    paint(true);
  });
  audio.addEventListener('pause',function(){paint(false);});
  audio.addEventListener('ended',function(){paint(false);});
  audio.addEventListener('error',function(){paint(false);});
})();

/* Keep audio and iOS Now Playing in sync when switching between stations. */
(function(){
  if(window.__radioMutualExclusionInstalled)return;
  var bbc=document.getElementById('radio4-audio');
  var nhk=document.getElementById('nhk-radio-audio');
  if(!bbc||!nhk||window.__radioMutualExclusionInstalled)return;
  window.__radioMutualExclusionInstalled=true;

  function syncNowPlaying(){
    if(!('mediaSession' in navigator))return;
    /* Radio pause events must not overwrite the podcast's active Now Playing session. */
    var podcastAudio=document.getElementById('podcast-audio');
    if(podcastAudio&&!podcastAudio.paused)return;
    try{
      if(!nhk.paused){
        navigator.mediaSession.metadata=typeof MediaMetadata!=='undefined'?new MediaMetadata({
          title:'NHK Radio 1',
          artist:'NHK らじる★らじる',
          album:'NHK Radio 1 — Live',
          artwork:[{src:'https://lanotfly.github.io/assets/images/nhk-radio-square.png?v=20261024-2',sizes:'64x64',type:'image/png'}]
        }):null;
        navigator.mediaSession.setActionHandler('play',function(){if(window.__prepareRadioPlayback)window.__prepareRadioPlayback();nhk.play().catch(function(){});});
        navigator.mediaSession.setActionHandler('pause',function(){nhk.pause();});
        navigator.mediaSession.playbackState='playing';
      }else if(!bbc.paused){
        navigator.mediaSession.metadata=typeof MediaMetadata!=='undefined'?new MediaMetadata({
          title:'BBC Radio',
          artist:'BBC Radio',
          album:'BBC Radio — Live',
          artwork:[{src:'https://lanotfly.github.io/assets/images/bbc-radio-4-now-playing.png?v=20261024-6',sizes:'64x64',type:'image/png'}]
        }):null;
        navigator.mediaSession.setActionHandler('play',function(){if(window.__prepareRadioPlayback)window.__prepareRadioPlayback();bbc.play().catch(function(){});});
        navigator.mediaSession.setActionHandler('pause',function(){bbc.pause();});
        navigator.mediaSession.playbackState='playing';
      }else{
        navigator.mediaSession.playbackState='paused';
      }
    }catch(_){}
  }
  function syncAfterEvents(){
    /* Let the outgoing station's pause event finish before choosing the active session. */
    setTimeout(syncNowPlaying,0);
  }
  bbc.addEventListener('play',function(){if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('radio4');syncAfterEvents();});
  nhk.addEventListener('play',function(){if(window.LibraryAudioCoordinator)window.LibraryAudioCoordinator.switchTo('nhk');syncAfterEvents();});
  bbc.addEventListener('pause',syncAfterEvents);
  nhk.addEventListener('pause',syncAfterEvents);
})();

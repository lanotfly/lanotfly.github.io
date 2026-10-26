/* Keep audio and iOS Now Playing in sync when switching between stations. */
(function(){
  if(window.__radioMutualExclusionInstalled)return;
  var bbc=document.getElementById('radio4-audio');
  var nhk=document.getElementById('nhk-radio-audio');
  if(!bbc||!nhk||window.__radioMutualExclusionInstalled)return;
  window.__radioMutualExclusionInstalled=true;

  function syncNowPlaying(){
    if(!('mediaSession' in navigator))return;
    /* Delegate station identity, cover art and lock-screen actions to the common manager. */
    var bibleAudio=document.getElementById('niv-bible-audio');
    var podcastBbc=document.getElementById('podcast-bbc-audio');
    var podcastChronicle=document.getElementById('podcast-chronicle-audio');
    var podcastEnglish=document.getElementById('podcast-english-audio');
    var podcastJapanese=document.getElementById('podcast-japanese-audio');
    if((bibleAudio&&!bibleAudio.paused)||
       (podcastBbc&&!podcastBbc.paused)||(podcastChronicle&&!podcastChronicle.paused)||
       (podcastEnglish&&!podcastEnglish.paused)||(podcastJapanese&&!podcastJapanese.paused))return;
    if(!nhk.paused && window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('nhk',nhk,{title:'NHK Radio 1',artist:'NHK らじる★らじる',album:'NHK Radio 1 — Live',artwork:window.LibraryAudioIdentity.getArtwork('nhk')});
    }else if(!bbc.paused && window.LibraryAudioIdentity){
      window.LibraryAudioIdentity.setNowPlaying('radio4',bbc,{title:'BBC Radio',artist:'BBC Radio',album:'BBC Radio — Live',artwork:window.LibraryAudioIdentity.getArtwork('radio4')});
    }else{
      try{navigator.mediaSession.playbackState='paused';}catch(_){}
    }
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
